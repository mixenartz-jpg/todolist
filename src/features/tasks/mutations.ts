"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { DateStr } from "@/lib/date/types";
import type { TaskRow } from "@/lib/db/database.types";
import { toTask } from "./queries";
import type { Task, TaskDraft } from "./types";

const TOGGLE_KEY = ["toggleTask"] as const;

/**
 * Görevi tamamlandı/tamamlanmadı yapar — optimistic.
 *
 * Rutin hücreleriyle aynı disiplin: uçuştaki sorgular iptal edilir,
 * önbellek anında yamalanır, hata olursa anlık görüntü geri yüklenir.
 * Kutucuğa basınca beklemek, günlük kullanımı yorucu yapar.
 */
export function useToggleTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: TOGGLE_KEY,

    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());

      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, done } : t)),
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.tasks(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => {
      if (qc.isMutating({ mutationKey: TOGGLE_KEY }) === 1) {
        qc.invalidateQueries({ queryKey: qk.tasks() });
      }
    },
  });
}

export function useCreateTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (draft: TaskDraft) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: draft.title.trim(),
          due_date: draft.dueDate,
          note: draft.note,
        })
        .select()
        .single();

      if (error) throw error;
      return toTask(data as TaskRow);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

export function useUpdateTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title: string;
      dueDate: DateStr | null;
      note: string | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({
          title: input.title.trim(),
          due_date: input.dueDate,
          note: input.note,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

export function useDeleteTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());
      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.filter((t) => t.id !== id),
      );
      return { previous };
    },

    onError: (error, _id, context) => {
      qc.setQueryData(qk.tasks(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks() }),
  });
}

/** Görevi başka bir güne taşır (ör. "yarına ertele"). */
export function useRescheduleTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dueDate }: { id: string; dueDate: DateStr | null }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({ due_date: dueDate })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, dueDate }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());
      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, dueDate } : t)),
      );
      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.tasks(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks() }),
  });
}

/**
 * Görevin saatini ve süresini ayarlar — optimistic.
 *
 * `startTime` null verilirse süre de temizlenir: veritabanı kısıtı
 * saatsiz süreye izin vermez ("45 dakika ama ne zaman?" bir plan
 * değildir) ve bunu istemcide zorlamak, sunucudan kısıt hatası almaya
 * yeğdir.
 */
export function useSetTaskTime(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      startTime,
      durationMinutes,
    }: {
      id: string;
      startTime: string | null;
      durationMinutes: number | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({
          start_time: startTime,
          duration_minutes: startTime ? durationMinutes : null,
        })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, startTime, durationMinutes }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());
      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) =>
          t.id === id
            ? {
                ...t,
                startTime,
                durationMinutes: startTime ? durationMinutes : null,
              }
            : t,
        ),
      );
      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.tasks(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks() }),
  });
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Kaydedilemedi, tekrar deneyin";
}
