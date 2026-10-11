"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { todayStr } from "@/lib/date/date";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { DateStr } from "@/lib/date/types";
import type { SortOrderPatch } from "@/features/planlama/reorder";
import type { RoutineDraft, RoutineWithSchedule, Schedule } from "./types";

/** Yeni rutin oluşturur ve ilk program sürümünü yazar. */
export function useCreateRoutine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (draft: RoutineDraft) => {
      const supabase = createClient();
      const today = todayStr();

      /*
       * Yeni rutin listenin SONUNA: veritabanı varsayılanı 0 ve
       * kullanıcı listeyi bir kez sıraladıysa (0..n-1) yeni rutin
       * baştan ikinci sıraya düşerdi.
       */
      const existing = qc.getQueryData<RoutineWithSchedule[]>(qk.routines()) ?? [];
      const sortOrder =
        existing.length === 0
          ? 0
          : Math.max(...existing.map((r) => r.sortOrder)) + 1;

      const { data: routine, error } = await supabase
        .from("routines")
        .insert({
          sort_order: sortOrder,
          name: draft.name.trim(),
          icon: draft.icon,
          color_slot: draft.colorSlot,
          target: draft.target,
          unit: draft.unit,
          start_date: today,
          // Yalnız VARSA yazılır: 0026 çalıştırılmadan süresiz rutin
          // eklemek bozulmasın.
          ...(draft.endDate !== null && { end_date: draft.endDate }),
          // Aynı gerekçe (0027): kategorisiz rutin migration'sız da eklenir.
          ...(draft.categoryId !== null && { category_id: draft.categoryId }),
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
      /** undefined → bitiş tarihine dokunulmaz; null → süresiz (0026). */
      endDate?: DateStr | null;
      /** undefined → kategoriye dokunulmaz; null → kategorisiz (0027). */
      categoryId?: string | null;
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
          ...(input.endDate !== undefined && { end_date: input.endDate }),
          ...(input.categoryId !== undefined && { category_id: input.categoryId }),
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

/**
 * Rutin listesinin sırasını yazar — optimistic.
 *
 * Görevlerdeki `useReorderTasks` ile aynı kalıp: yamalar `planReorder`
 * / `planMoveTo` ile hesaplanır, yalnızca değişen satırlar gelir ve
 * paralel `update`'lerle yazılır. Sıra Bugün ekranına ve tabloya da
 * yansır — hepsi `sort_order`'a göre okuyor.
 *
 * `move` verilirse rutin AYNI hareketle başka bir kategoriye de geçer
 * (başka bir grubun satırına bırakıldığında). Tek mutation: kategori
 * ve sıra ayrı ayrı yazılsaydı arada liste bir kez yanlış gruba
 * zıplardı.
 */
export function useReorderRoutines(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patches,
      move,
    }: {
      patches: readonly SortOrderPatch[];
      move?: { id: string; categoryId: string | null };
    }) => {
      const supabase = createClient();
      const sortOf = new Map(patches.map((p) => [p.id, p.sortOrder]));
      const ids = new Set([...sortOf.keys(), ...(move ? [move.id] : [])]);
      if (ids.size === 0) return;

      const results = await Promise.all(
        [...ids].map((id) =>
          supabase
            .from("routines")
            .update({
              ...(sortOf.has(id) && { sort_order: sortOf.get(id) }),
              ...(move?.id === id && { category_id: move.categoryId }),
            })
            .eq("id", id),
        ),
      );

      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },

    onMutate: async ({ patches, move }) => {
      await qc.cancelQueries({ queryKey: qk.routines() });
      const previous = qc.getQueryData<RoutineWithSchedule[]>(qk.routines());

      const byId = new Map(patches.map((p) => [p.id, p.sortOrder]));
      qc.setQueryData<RoutineWithSchedule[]>(qk.routines(), (routines) =>
        routines
          ?.map((r) => {
            const sortOrder = byId.get(r.id) ?? r.sortOrder;
            const categoryId = move?.id === r.id ? move.categoryId : r.categoryId;
            return { ...r, sortOrder, categoryId };
          })
          // Kararlı sıralama: eşitlikte sunucunun `created_at` sırası korunur.
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.routines(), context?.previous);
      onError?.(error instanceof Error ? error.message : "Bir hata oluştu");
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.routines() }),
  });
}
