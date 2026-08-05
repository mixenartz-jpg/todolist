"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { todayStr } from "@/lib/date/date";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { RoutineDraft, Schedule } from "./types";

/** Yeni rutin oluşturur ve ilk program sürümünü yazar. */
export function useCreateRoutine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (draft: RoutineDraft) => {
      const supabase = createClient();
      const today = todayStr();

      const { data: routine, error } = await supabase
        .from("routines")
        .insert({
          name: draft.name.trim(),
          icon: draft.icon,
          color_slot: draft.colorSlot,
          target: draft.target,
          unit: draft.unit,
          start_date: today,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger varsayılan "her gün" programını yazdı; istenen program
      // farklıysa aynı güne yazarak onu değiştiriyoruz.
      if (draft.schedule.kind !== "daily") {
        const { error: scheduleError } = await supabase
          .from("routine_schedules")
          .upsert(
            {
              routine_id: routine.id,
              effective_from: today,
              schedule: draft.schedule,
            },
            { onConflict: "routine_id,effective_from" },
          );
        if (scheduleError) throw scheduleError;
      }

      return routine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.routines() }),
  });
}

/**
 * Rutinin kimlik alanlarını günceller (ad, renk, hedef, birim).
 * Program burada DEĞİŞMEZ — onun için `useChangeSchedule`.
 */
export function useUpdateRoutine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      icon: string | null;
      colorSlot: number;
      target: number;
      unit: string | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("routines")
        .update({
          name: input.name.trim(),
          icon: input.icon,
          color_slot: input.colorSlot,
          target: input.target,
          unit: input.unit,
        })
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.routines() }),
  });
}

/**
 * Programı bugünden itibaren değiştirir.
 *
 * Mevcut satırı GÜNCELLEMEZ, bugüne yeni bir sürüm yazar. Geçmiş
 * günler eski programa göre değerlendirilmeye devam eder — yüzdeler
 * ve seriler geriye dönük yeniden yazılmaz.
 *
 * Aynı gün içinde birden çok değişiklik yapılırsa upsert son değeri
 * tutar; gereksiz sürüm birikmez.
 */
export function useChangeSchedule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { routineId: string; schedule: Schedule }) => {
      const supabase = createClient();
      const { error } = await supabase.from("routine_schedules").upsert(
        {
          routine_id: input.routineId,
          effective_from: todayStr(),
          schedule: input.schedule,
        },
        { onConflict: "routine_id,effective_from" },
      );

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.routines() }),
  });
}

/**
 * Rutini arşivler veya arşivden çıkarır.
 *
 * Arşiv silmek değildir: geçmiş kayıtlar ve istatistikler korunur,
 * yalnızca bugünden sonrası zorunlu olmaktan çıkar.
 */
export function useArchiveRoutine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("routines")
        .update({ archived_at: input.archived ? new Date().toISOString() : null })
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.routines() }),
  });
}

/** Rutini ve tüm kayıtlarını kalıcı olarak siler. */
export function useDeleteRoutine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("routines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.routines() });
      qc.invalidateQueries({ queryKey: qk.entries() });
    },
  });
}
