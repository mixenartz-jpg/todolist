"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/features/tasks/types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { TaskPlan } from "./title";

/**
 * Katalogdan görev oluştur: görevler + görev↔test bağları. İyimser:
 * görev listesi ve kutucuklar sunucuyu beklemeden sarıya döner.
 *
 * Kimlikler istemcide üretilir (uuid) ki `task_items` aynı turda
 * yazılabilsin ve iyimser satır sunucudakiyle aynı kimliği taşısın.
 */
export function useCreatePlannedTasks(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { plans: TaskPlan[]; ids: string[]; planBatchId?: string | null }) => {
      const supabase = createClient();
      const rows = input.plans.map((p, i) => ({
        id: input.ids[i],
        title: p.title,
        due_date: p.dueDate,
        note: null,
        source_id: p.sourceId,
        section_id: p.sectionId,
        range_from: p.rangeFrom,
        range_to: p.rangeTo,
        target_amount: p.targetAmount,
        action: p.action,
        estimate_minutes: p.estimateMinutes,
        plan_batch_id: input.planBatchId ?? null,
      }));
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;

      const links = input.plans.flatMap((p, i) => p.itemIds.map((item_id) => ({ task_id: input.ids[i], item_id })));
      if (links.length > 0) {
        const res = await supabase.from("task_items").insert(links);
        if (res.error) {
          // Bağ yazılamadıysa yarım görev bırakma.
          await supabase.from("tasks").delete().in("id", input.ids);
          throw res.error;
        }
      }

      // İlk bağ → kaynak "devam" (sıradaysa).
      const sourceIds = [...new Set(input.plans.map((p) => p.sourceId))];
      await supabase.from("sources").update({ status: "devam" }).in("id", sourceIds).eq("status", "sirada");
    },

    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      await qc.cancelQueries({ queryKey: qk.taskItems() });
      const prevTasks = qc.getQueryData<Task[]>(qk.tasks());
      const prevItems = qc.getQueryData<Array<{ taskId: string; itemId: string }>>(qk.taskItems());

      const optimistic: Task[] = input.plans.map((p, i) => ({
        id: input.ids[i],
        title: p.title,
        dueDate: p.dueDate,
        done: false,
        note: null,
        sortOrder: 0,
        completedAt: null,
        categoryId: null,
        goalId: null,
        nodeId: null,
        colorSlot: null,
        estimateMinutes: p.estimateMinutes,
        sourceId: p.sourceId,
        sectionId: p.sectionId,
        rangeFrom: p.rangeFrom,
        rangeTo: p.rangeTo,
        targetAmount: p.targetAmount,
        action: p.action,
        planBatchId: input.planBatchId ?? null,
        routineId: null,
      }));
      qc.setQueryData<Task[]>(qk.tasks(), (list) => (list ? [...list, ...optimistic] : list));
      qc.setQueryData<Array<{ taskId: string; itemId: string }>>(qk.taskItems(), (list) =>
        list
          ? [...list, ...input.plans.flatMap((p, i) => p.itemIds.map((itemId) => ({ taskId: input.ids[i], itemId })))]
          : list,
      );
      return { prevTasks, prevItems };
    },

    onError: (e, _v, ctx) => {
      qc.setQueryData(qk.tasks(), ctx?.prevTasks);
      qc.setQueryData(qk.taskItems(), ctx?.prevItems);
      onError?.(e instanceof Error ? e.message : "Görev eklenemedi");
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks() });
      qc.invalidateQueries({ queryKey: qk.taskItems() });
      qc.invalidateQueries({ queryKey: qk.sources() });
    },
  });
}

export function newIds(n: number): string[] {
  return Array.from({ length: n }, () => crypto.randomUUID());
}
