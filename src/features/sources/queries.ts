"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toTaskResult } from "@/features/results/queries";
import type { TaskResult } from "@/features/results/types";
import type {
  SourceItemRow,
  SourceRow,
  SourceSectionRow,
  SourceSeriesRow,
  TaskItemRow,
  TaskResultRow,
  TopicRow,
} from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { TreeOps } from "./tree";
import type { Exam, SourceDraft, SourceStatus, SourceTree, Topic } from "./types";

type TreeRow = SourceRow & {
  source_series: Array<SourceSeriesRow & { source_sections: Array<SourceSectionRow & { source_items: SourceItemRow[] }> }>;
};

/**
 * Tüm etkin kaynaklar, ağaçlarıyla. Bir öğrencinin onlarca kaynağı ×
 * birkaç yüz testi tek sorguda rahat gelir; katalog, yan panel ve
 * Dağıt aynı önbelleği okur.
 */
export function useSourceTrees() {
  return useQuery({
    queryKey: qk.sources(),
    queryFn: async (): Promise<SourceTree[]> => {
      const { data, error } = await createClient()
        .from("sources")
        .select("*, source_series(*, source_sections(*, source_items(*)))")
        .is("archived_at", null)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data as TreeRow[]).map(toSourceTree);
    },
  });
}

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

export function toSourceTree(row: TreeRow): SourceTree {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    exam: row.exam ?? null,
    kind: row.kind ?? "kitap",
    publisher: row.publisher ?? null,
    level: row.level ?? null,
    unit: row.unit,
    minutesPerUnit: row.minutes_per_unit != null ? Number(row.minutes_per_unit) : null,
    status: row.status ?? "sirada",
    totalTests: row.total_tests,
    studentId: row.student_id ?? null,
    aliases: row.aliases ?? [],
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
    series: [...(row.source_series ?? [])].sort(bySort).map((s) => ({
      id: s.id,
      sourceId: s.source_id,
      name: s.name,
      kind: s.kind,
      sortOrder: s.sort_order,
      sections: [...(s.source_sections ?? [])].sort(bySort).map((sec) => ({
        id: sec.id,
        seriesId: sec.series_id,
        topicId: sec.topic_id,
        label: sec.label,
        unitFrom: sec.unit_from,
        unitTo: sec.unit_to,
        sortOrder: sec.sort_order,
        items: [...(sec.source_items ?? [])]
          .sort((a, b) => a.number - b.number)
          .map((i) => ({ id: i.id, sectionId: i.section_id, number: i.number, topicId: i.topic_id })),
      })),
    })),
  };
}

export function useTopics() {
  return useQuery({
    queryKey: qk.topics(),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Topic[]> => {
      const { data, error } = await createClient()
        .from("topics")
        .select("*")
        .order("subject")
        .order("exam")
        .order("sort_order");
      if (error) throw error;
      return (data as TopicRow[]).map((t) => ({
        id: t.id,
        subject: t.subject,
        exam: t.exam,
        name: t.name,
        aliases: t.aliases ?? [],
        sortOrder: t.sort_order,
      }));
    },
  });
}

export function useTaskItems() {
  return useQuery({
    queryKey: qk.taskItems(),
    queryFn: async (): Promise<Array<{ taskId: string; itemId: string }>> => {
      const { data, error } = await createClient().from("task_items").select("task_id, item_id");
      if (error) throw error;
      return (data as TaskItemRow[]).map((r) => ({ taskId: r.task_id, itemId: r.item_id }));
    },
  });
}

/** Kaynağa bağlı görevlerin bütün sonuçları (ilerleme pencereye sığmaz). */
export function useSourceResults(studentId: string | null) {
  return useQuery({
    queryKey: qk.sourceResults(studentId ?? "-"),
    enabled: studentId !== null,
    queryFn: async (): Promise<TaskResult[]> => {
      const { data, error } = await createClient()
        .from("task_results")
        .select("*, tasks!inner(source_id)")
        .eq("student_id", studentId!)
        .not("tasks.source_id", "is", null);
      if (error) throw error;
      return (data as TaskResultRow[]).map(toTaskResult);
    },
  });
}

function draftRow(d: SourceDraft) {
  return {
    title: d.title.trim(),
    kind: d.kind,
    publisher: d.publisher?.trim() || null,
    subject: d.subject?.trim() || null,
    exam: d.exam,
    level: d.level,
    unit: d.unit,
    minutes_per_unit: d.minutesPerUnit,
  };
}

/**
 * Kaynağı ve ağacını kaydet. Sıra önemli: seri → bölüm → test upsert
 * (test bölüm değiştirebilir), SONRA silmeler (en alttan yukarı).
 * Yarıda kesilirse yeniden kaydetmek tutarlı hâle getirir: işlemler
 * id'lerle idempotent.
 */
export function useSaveSource(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      isNew: boolean;
      draft: SourceDraft;
      studentId: string | null;
      ops: TreeOps;
    }): Promise<string> => {
      const supabase = createClient();
      const row = { ...draftRow(input.draft), total_tests: Math.max(1, input.ops.totalUnits) };
      const head = input.isNew
        ? await supabase.from("sources").insert({ ...row, id: input.id, student_id: input.studentId })
        : await supabase.from("sources").update(row).eq("id", input.id);
      if (head.error) throw head.error;

      const steps: Array<() => PromiseLike<{ error: unknown }>> = [
        () => (input.ops.series.length ? supabase.from("source_series").upsert(input.ops.series) : noop()),
        () => (input.ops.sections.length ? supabase.from("source_sections").upsert(input.ops.sections) : noop()),
        () => (input.ops.items.length ? supabase.from("source_items").upsert(input.ops.items) : noop()),
        () => (input.ops.deleteItems.length ? supabase.from("source_items").delete().in("id", input.ops.deleteItems) : noop()),
        () =>
          input.ops.deleteSections.length
            ? supabase.from("source_sections").delete().in("id", input.ops.deleteSections)
            : noop(),
        () =>
          input.ops.deleteSeries.length ? supabase.from("source_series").delete().in("id", input.ops.deleteSeries) : noop(),
      ];
      for (const step of steps) {
        const { error } = await step();
        if (error) throw error;
      }
      return input.id;
    },
    onError: (e) => onError?.(e instanceof Error ? e.message : "Kaydedilemedi"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.sources() });
      qc.invalidateQueries({ queryKey: qk.taskItems() });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
  });
}

function noop(): Promise<{ error: null }> {
  return Promise.resolve({ error: null });
}

export function useSetSourceStatus(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SourceStatus }) => {
      const { error } = await createClient().from("sources").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: qk.sources() });
      const prev = qc.getQueryData<SourceTree[]>(qk.sources());
      qc.setQueryData<SourceTree[]>(qk.sources(), (list) => list?.map((s) => (s.id === id ? { ...s, status } : s)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(qk.sources(), ctx?.prev);
      onError?.(e instanceof Error ? e.message : "Güncellenemedi");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.sources() }),
  });
}

/** Silmek yerine arşivle: bağlı görevler ilerleme geçmişini korusun. */
export function useArchiveSource(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient()
        .from("sources")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onError: (e) => onError?.(e instanceof Error ? e.message : "Arşivlenemedi"),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.sources() }),
  });
}

/** Ortak konu listesine tek tıkla ekle (önizlemedeki "yeni konu"). */
export function useAddTopic(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { subject: string; exam: Exam; name: string }): Promise<Topic> => {
      const { data, error } = await createClient()
        .from("topics")
        .insert({ subject: input.subject, exam: input.exam, name: input.name.trim(), sort_order: 1000 })
        .select()
        .single();
      if (error) throw error;
      const t = data as TopicRow;
      return { id: t.id, subject: t.subject, exam: t.exam, name: t.name, aliases: t.aliases ?? [], sortOrder: t.sort_order };
    },
    onError: (e) => onError?.(e instanceof Error ? e.message : "Konu eklenemedi"),
    onSuccess: (topic) => qc.setQueryData<Topic[]>(qk.topics(), (list) => [...(list ?? []), topic]),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.topics() }),
  });
}

/**
 * Görev → bağlı testler (numaralarıyla). Öğrencinin "yarım" formunda
 * hangi testleri yaptığını işaretlemesi için; koç da okur.
 */
export function useTaskItemNumbers() {
  return useQuery({
    queryKey: [...qk.taskItems(), "numbers"] as const,
    queryFn: async (): Promise<Map<string, Array<{ id: string; number: number }>>> => {
      const { data, error } = await createClient().from("task_items").select("task_id, item_id, source_items(number)");
      if (error) throw error;
      const map = new Map<string, Array<{ id: string; number: number }>>();
      for (const row of data as unknown as Array<{ task_id: string; item_id: string; source_items: { number: number } | null }>) {
        const list = map.get(row.task_id) ?? [];
        list.push({ id: row.item_id, number: row.source_items?.number ?? 0 });
        map.set(row.task_id, list);
      }
      for (const list of map.values()) list.sort((a, b) => a.number - b.number);
      return map;
    },
  });
}

/** Kaynak → birim ("sayfa"); İlerlet formunun etiketi için hafif sorgu. */
export function useSourceUnits() {
  return useQuery({
    queryKey: [...qk.sources(), "units"] as const,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await createClient().from("sources").select("id, unit");
      if (error) throw error;
      return new Map((data as Array<{ id: string; unit: string }>).map((r) => [r.id, r.unit]));
    },
  });
}
