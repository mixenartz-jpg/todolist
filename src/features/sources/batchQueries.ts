"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/features/tasks/types";
import type { DateStr, IsoWeekday } from "@/lib/date/types";
import type { PlanBatchRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

export interface PlanBatch {
  id: string;
  label: string;
  topicId: string | null;
  sourceId: string | null;
  seriesId: string | null;
  skipWeekdays: IsoWeekday[];
  createdAt: string;
}

export function usePlanBatches() {
  return useQuery({
    queryKey: qk.planBatches(),
    queryFn: async (): Promise<PlanBatch[]> => {
      const { data, error } = await createClient()
        .from("plan_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as PlanBatchRow[]).map((b) => ({
        id: b.id,
        label: b.label,
        topicId: b.topic_id,
        sourceId: b.source_id,
        seriesId: b.series_id,
        skipWeekdays: (b.skip_weekdays ?? []) as IsoWeekday[],
        createdAt: b.created_at,
      }));
    },
  });
}

/** Dağıtım kaydını aç (görevlerden ÖNCE: FK). */
export async function insertBatch(input: {
  id: string;
  label: string;
  studentId: string | null;
  topicId: string | null;
  sourceId: string | null;
  seriesId: string | null;
  skipWeekdays: IsoWeekday[];
}): Promise<void> {
  const { error } = await createClient().from("plan_batches").insert({
    id: input.id,
    label: input.label.slice(0, 160),
    student_id: input.studentId,
    topic_id: input.topicId,
    source_id: input.sourceId,
    series_id: input.seriesId,
    skip_weekdays: input.skipWeekdays,
  });
  if (error) throw error;
}

/** Dağıtımı sil: verilen (sonuçsuz) görevler; kayıt, görevi kalmadıysa. */
export function useDeleteBatchTasks(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { batchId: string; taskIds: string[]; dropBatch: boolean }) => {
      const supabase = createClient();
      if (input.taskIds.length) {
        const { error } = await supabase.from("tasks").delete().in("id", input.taskIds);
        if (error) throw error;
      }
      if (input.dropBatch) {
        const { error } = await supabase.from("plan_batches").delete().eq("id", input.batchId);
        if (error) throw error;
      }
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const prev = qc.getQueryData<Task[]>(qk.tasks());
      const ids = new Set(input.taskIds);
      qc.setQueryData<Task[]>(qk.tasks(), (list) => list?.filter((t) => !ids.has(t.id)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(qk.tasks(), ctx?.prev);
      onError?.(e instanceof Error ? e.message : "Silinemedi");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks() });
      qc.invalidateQueries({ queryKey: qk.taskItems() });
      qc.invalidateQueries({ queryKey: qk.planBatches() });
    },
  });
}

/** Kaydır: görevlerin günlerini toplu değiştir. */
export function useMoveTasks(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (moves: Array<{ id: string; dueDate: DateStr }>) => {
      const supabase = createClient();
      // Aynı güne gidenler tek sorguda.
      const byDate = new Map<DateStr, string[]>();
      for (const m of moves) byDate.set(m.dueDate, [...(byDate.get(m.dueDate) ?? []), m.id]);
      for (const [date, ids] of byDate) {
        const { error } = await supabase.from("tasks").update({ due_date: date }).in("id", ids);
        if (error) throw error;
      }
    },
    onMutate: async (moves) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const prev = qc.getQueryData<Task[]>(qk.tasks());
      const to = new Map(moves.map((m) => [m.id, m.dueDate]));
      qc.setQueryData<Task[]>(qk.tasks(), (list) =>
        list?.map((t) => (to.has(t.id) ? { ...t, dueDate: to.get(t.id)! } : t)),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(qk.tasks(), ctx?.prev);
      onError?.(e instanceof Error ? e.message : "Kaydırılamadı");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks() }),
  });
}
