"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskActionRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import { allActions } from "./actions";

/** Varsayılanlar + koçun eklediği eylemler. */
export function useTaskActions() {
  const q = useQuery({
    queryKey: qk.taskActions(),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await createClient().from("task_actions").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return (data as TaskActionRow[]).map((r) => r.label);
    },
  });
  return allActions(q.data ?? []);
}

export function useAddTaskAction(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (label: string) => {
      const { error } = await createClient().from("task_actions").insert({ label: label.trim() });
      if (error) throw error;
    },
    onMutate: (label) => {
      qc.setQueryData<string[]>(qk.taskActions(), (list) => [...(list ?? []), label.trim()]);
    },
    onError: (e) => onError?.(e instanceof Error ? e.message : "Eylem eklenemedi"),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.taskActions() }),
  });
}
