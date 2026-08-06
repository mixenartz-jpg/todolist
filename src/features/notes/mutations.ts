"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DateStr } from "@/lib/date/types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { DayNote, Mood } from "./types";

interface SaveNoteVars {
  date: DateStr;
  note: string | null;
  mood: Mood | null;
}

/**
 * Günün notunu ve ruh halini kaydeder.
 *
 * Not alanı yazarken sürekli kaydedilir (bileşen tarafında geciktirilir);
 * mood tıklandığı an. Her ikisi de tek satırı upsert eder, bu yüzden
 * mood değişimi yazılmakta olan notu ezmesin diye ikisi birlikte
 * gönderilir.
 *
 * Not tamamen boşaltılıp mood da kaldırılırsa satır silinir — boş
 * satır tutmanın anlamı yok.
 */
export function useSaveDayNote(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, note, mood }: SaveNoteVars) => {
      const supabase = createClient();
      const trimmed = note?.trim() ? note.trim() : null;

      if (trimmed === null && mood === null) {
        const { error } = await supabase.from("day_notes").delete().eq("date", date);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("day_notes")
        .upsert({ date, note: trimmed, mood }, { onConflict: "user_id,date" });
      if (error) throw error;
    },

    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: qk.note(vars.date) });
      const previous = qc.getQueryData<DayNote>(qk.note(vars.date));

      qc.setQueryData<DayNote>(qk.note(vars.date), {
        date: vars.date,
        note: vars.note,
        mood: vars.mood,
      });

      return { previous };
    },

    onError: (error, vars, context) => {
      qc.setQueryData(qk.note(vars.date), context?.previous);
      onError?.(
        error instanceof Error ? error.message : "Not kaydedilemedi",
      );
    },

    // Yeniden çekme YOK: kullanıcı yazmaya devam ediyor olabilir ve
    // sunucudan gelen yanıt imleci/metni geri sarardı. Optimistic
    // durum zaten doğru; hata olursa geri alınıyor.
  });
}
