"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PeriodNoteRow } from "@/lib/db/database.types";
import type { DateStr } from "@/lib/date/types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { PeriodNote } from "./types";

/** DB kısıtı (0025): amaç metni en fazla 4000 karakter. */
export const PERIOD_NOTE_MAX = 4000;

type Scale = PeriodNote["scale"];

/**
 * Ayın / haftanın amaç metni (0025).
 *
 * Satır yoksa boş metin döner: "henüz yazılmadı" ile "boş yazıldı"
 * arasında arayüzün ayırt edeceği bir fark yok.
 */
export function usePeriodNote(scale: Scale, periodStart: DateStr) {
  return useQuery({
    queryKey: qk.periodNote(scale, periodStart),
    queryFn: async (): Promise<PeriodNote> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("period_notes")
        .select("*")
        .eq("scale", scale)
        .eq("period_start", periodStart)
        .maybeSingle();
      if (error) throw error;

      const row = data as PeriodNoteRow | null;
      return { scale, periodStart, body: row?.body ?? "" };
    },
  });
}

/**
 * Amaç metnini kaydeder — autosave'den çağrılır, iyimser.
 *
 * Tek `upsert`: boş metin de yazılır, satır silinmez. `useSaveDayPlan`'ın
 * "boşsa sil" dalı burada gereksiz — satırın paylaştığı başka sütun yok.
 *
 * `onSettled`'da tazeleme YOK: kullanıcı hâlâ yazıyor olabilir ve
 * sunucudan gelen yanıt metni geri sarardı (DayPlanEditor'daki gerekçe).
 */
export function useSavePeriodNote(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ scale, periodStart, body }: PeriodNote) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("period_notes")
        .upsert(
          { scale, period_start: periodStart, body },
          { onConflict: "user_id,scale,period_start" },
        );
      if (error) throw error;
    },

    onMutate: async (vars) => {
      const key = qk.periodNote(vars.scale, vars.periodStart);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PeriodNote>(key);
      qc.setQueryData<PeriodNote>(key, vars);
      return { previous, key };
    },

    onError: (error, _vars, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      onError?.(error instanceof Error ? error.message : "Kaydedilemedi");
    },
  });
}
