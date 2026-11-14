"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SourceRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { Source, SourceDraft } from "./types";

export function useSources() {
  return useQuery({
    queryKey: qk.sources(),
    queryFn: async (): Promise<Source[]> => {
      const { data, error } = await createClient()
        .from("sources")
        .select("*")
        .is("archived_at", null)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data as SourceRow[]).map(toSource);
    },
  });
}

export function toSource(row: SourceRow): Source {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    totalTests: row.total_tests,
    unit: row.unit,
    aliases: row.aliases ?? [],
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  };
}

function toRow(d: SourceDraft) {
  return {
    title: d.title.trim(),
    subject: d.subject?.trim() || null,
    total_tests: d.totalTests,
    unit: d.unit,
    aliases: d.aliases,
  };
}

export function useSaveSource(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, draft }: { id?: string; draft: SourceDraft }) => {
      const supabase = createClient();
      const query = id
        ? supabase.from("sources").update(toRow(draft)).eq("id", id)
        : supabase.from("sources").insert(toRow(draft));
      const { error } = await query;
      if (error) throw error;
    },
    onError: (e) => onError?.(e instanceof Error ? e.message : "Kaydedilemedi"),
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
