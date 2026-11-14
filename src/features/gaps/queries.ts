"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { asDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { GapItemRow, TaskRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

export type GapStatus = "open" | "planned" | "closed";

export interface GapItem {
  id: string;
  topic: string;
  subject: string | null;
  firstSeen: DateStr;
  lastSeen: DateStr;
  count: number;
  status: GapStatus;
  taskId: string | null;
}

function toGap(r: GapItemRow): GapItem {
  return {
    id: r.id,
    topic: r.topic,
    subject: r.subject,
    firstSeen: asDateStr(r.first_seen),
    lastSeen: asDateStr(r.last_seen),
    count: r.count,
    status: r.status,
    taskId: r.task_id,
  };
}

export function useGapItems(enabled: boolean) {
  return useQuery({
    queryKey: qk.gapItems(),
    enabled,
    queryFn: async (): Promise<GapItem[]> => {
      const { data, error } = await createClient()
        .from("gap_items")
        .select("*")
        .order("last_seen", { ascending: false });
      if (error) throw error;
      return (data as GapItemRow[]).map(toGap);
    },
  });
}

/** Açık önce, sonra planlı, sonra kapalı; her grupta sık olan önde. */
export function sortGaps(items: readonly GapItem[]): GapItem[] {
  const rank: Record<GapStatus, number> = { open: 0, planned: 1, closed: 2 };
  return [...items].sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      b.count - a.count ||
      (a.lastSeen < b.lastSeen ? 1 : -1),
  );
}

/**
 * "Göreve çevir": seçilen güne görev oluştur, konuyu ona bağla.
 * Görev bitince veritabanı trigger'ı konuyu kapatır.
 */
export function useGapToTask(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gap, date }: { gap: GapItem; date: DateStr }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .insert({ title: `Eksik konu | ${gap.topic}`, due_date: date })
        .select()
        .single();
      if (error) throw error;
      const task = data as TaskRow;
      const { error: linkError } = await supabase
        .from("gap_items")
        .update({ status: "planned", task_id: task.id })
        .eq("id", gap.id);
      if (linkError) throw linkError;
    },
    onError: (e) => onError?.(e instanceof Error ? e.message : "Görev oluşturulamadı"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.gapItems() });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
  });
}

export function useSetGapStatus(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GapStatus }) => {
      const { error } = await createClient()
        .from("gap_items")
        .update({
          status,
          closed_at: status === "closed" ? new Date().toISOString() : null,
          ...(status === "open" && { task_id: null }),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onError: (e) => onError?.(e instanceof Error ? e.message : "Güncellenemedi"),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.gapItems() }),
  });
}
