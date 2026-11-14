"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SourceItemMarkRow, SourceRangeMarkRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import { applyRangeMark } from "./marks";
import type { ItemMark, RangeMark } from "./progress";
import type { MarkStatus } from "./unitStatus";

export interface SourceMarks {
  items: ItemMark[];
  ranges: RangeMark[];
}

export function useSourceMarks() {
  return useQuery({
    queryKey: qk.sourceMarks(),
    queryFn: async (): Promise<SourceMarks> => {
      const supabase = createClient();
      const [items, ranges] = await Promise.all([
        supabase.from("source_item_marks").select("*"),
        supabase.from("source_range_marks").select("*"),
      ]);
      if (items.error) throw items.error;
      if (ranges.error) throw ranges.error;
      return {
        items: (items.data as SourceItemMarkRow[]).map((r) => ({
          itemId: r.item_id,
          status: r.status,
          markedAt: r.marked_at,
          note: r.note,
        })),
        ranges: (ranges.data as SourceRangeMarkRow[]).map((r) => ({
          sectionId: r.section_id,
          from: r.unit_from,
          to: r.unit_to,
          status: r.status,
          markedAt: r.marked_at,
          note: r.note,
        })),
      };
    },
  });
}

/**
 * Testlere elle işaret koy / kaldır. `status: null` → kaldır. İyimser:
 * kutucuk rengi anında değişir.
 */
export function useMarkItems(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { itemIds: string[]; status: MarkStatus | null; note: string | null }) => {
      const supabase = createClient();
      const { error } =
        input.status === null
          ? await supabase.from("source_item_marks").delete().in("item_id", input.itemIds)
          : await supabase.from("source_item_marks").upsert(
              input.itemIds.map((item_id) => ({
                item_id,
                status: input.status,
                note: input.note,
                marked_at: new Date().toISOString(),
              })),
            );
      if (error) throw error;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.sourceMarks() });
      const prev = qc.getQueryData<SourceMarks>(qk.sourceMarks());
      const ids = new Set(input.itemIds);
      const now = new Date().toISOString();
      qc.setQueryData<SourceMarks>(qk.sourceMarks(), (m) =>
        m
          ? {
              ...m,
              items: [
                ...m.items.filter((x) => !ids.has(x.itemId)),
                ...(input.status
                  ? input.itemIds.map((itemId) => ({ itemId, status: input.status!, markedAt: now, note: input.note }))
                  : []),
              ],
            }
          : m,
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(qk.sourceMarks(), ctx?.prev);
      onError?.(e instanceof Error ? e.message : "İşaretlenemedi");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.sourceMarks() }),
  });
}

function foldSpans(
  current: RangeMark[],
  spans: ReadonlyArray<{ from: number; to: number }>,
  status: MarkStatus | null,
  note: string | null,
) {
  const markedAt = new Date().toISOString();
  return spans.reduce(
    (acc, sp) => applyRangeMark(acc, sp.from, sp.to, status ? { status, markedAt, note } : null),
    current as ReturnType<typeof applyRangeMark>,
  );
}

/** Bölümde aralık(lar) işaretle / kaldır ("1-52 çözüldü"). */
export function useMarkRange(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sectionId: string;
      spans: ReadonlyArray<{ from: number; to: number }>;
      status: MarkStatus | null;
      note: string | null;
      current: RangeMark[];
    }) => {
      const next = foldSpans(input.current, input.spans, input.status, input.note);
      const supabase = createClient();
      const del = await supabase.from("source_range_marks").delete().eq("section_id", input.sectionId);
      if (del.error) throw del.error;
      if (next.length > 0) {
        const ins = await supabase.from("source_range_marks").insert(
          next.map((m) => ({
            section_id: input.sectionId,
            unit_from: m.from,
            unit_to: m.to,
            status: m.status,
            marked_at: m.markedAt,
            note: m.note,
          })),
        );
        if (ins.error) throw ins.error;
      }
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.sourceMarks() });
      const prev = qc.getQueryData<SourceMarks>(qk.sourceMarks());
      const next = foldSpans(input.current, input.spans, input.status, input.note);
      qc.setQueryData<SourceMarks>(qk.sourceMarks(), (m) =>
        m
          ? {
              ...m,
              ranges: [
                ...m.ranges.filter((r) => r.sectionId !== input.sectionId),
                ...next.map((r) => ({ ...r, sectionId: input.sectionId })),
              ],
            }
          : m,
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(qk.sourceMarks(), ctx?.prev);
      onError?.(e instanceof Error ? e.message : "İşaretlenemedi");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.sourceMarks() }),
  });
}
