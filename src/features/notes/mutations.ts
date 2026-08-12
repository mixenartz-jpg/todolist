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

interface SavePlanVars {
  date: DateStr;
  plan: string | null;
}

/**
 * Günün notunu ve ruh halini kaydeder.
 *
 * Not alanı yazarken sürekli kaydedilir (bileşen tarafında geciktirilir);
 * mood tıklandığı an. Her ikisi de tek satırı upsert eder, bu yüzden
 * mood değişimi yazılmakta olan notu ezmesin diye ikisi birlikte
 * gönderilir.
 *
 * ── Satır ne zaman SİLİNİR? ──
 * Aynı satırda artık üçüncü bir alan var: `plan` (Planlama ekranı).
 * Silme koşulu onu da SORMAK ZORUNDA — yoksa Bugün ekranında notu ve
 * ruh halini temizleyen kullanıcı, Planlama'da yazdığı günün planını
 * da sessizce silerdi. Bu yüzden koşul önbellekteki `plan` değerine
 * bakar ve yalnızca ÜÇÜ DE boşsa satırı kaldırır.
 *
 * `plan` upsert'e GÖNDERİLMEZ: iki mutation kesişmeyen sütun kümeleri
 * yazar ve birbirini ezmez. Buraya `plan` eklemek, Bugün ekranındaki
 * bayat bir değerin Planlama'da yazılanı geri almasına yol açardı.
 */
export function useSaveDayNote(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, note, mood }: SaveNoteVars) => {
      const supabase = createClient();
      const trimmed = note?.trim() ? note.trim() : null;

      if (trimmed === null && mood === null) {
        /*
         * Plan var mı? Önbellekten okunur, sunucudan değil: ek bir
         * gidiş-dönüş, her tuş vuruşunda tetiklenen bir autosave için
         * pahalı olurdu. Önbellek bayatsa en kötü ihtimalle boş bir
         * satır kalır — veri KAYBI değil, zararsız bir artık.
         */
        const cached = qc.getQueryData<DayNote>(qk.note(date));
        const hasPlan = Boolean(cached?.plan?.trim());

        if (!hasPlan) {
          const { error } = await supabase
            .from("day_notes")
            .delete()
            .eq("date", date);
          if (error) throw error;
          return;
        }

        // Plan duruyor: satırı silme, yalnızca not ve ruh halini boşalt.
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
        // `plan` KORUNUR: bu mutation ona dokunmuyor ve önbellekten
        // düşürmek, gün paneli açıkken metnin gözden kaybolması olurdu.
        plan: previous?.plan ?? null,
      });

      return { previous };
    },

    /*
     * Geri alma YALNIZCA bu mutation'ın sahip olduğu alanları
     * (`note`, `mood`) eski değerine döndürür; `plan` o anki
     * önbellekten OLDUĞU GİBİ taşınır.
     *
     * Anlık görüntünün tamamını yazmak yanlış olurdu: iki mutation
     * aynı satırı paylaşıyor ve biri uçuştayken öteki başarıyla
     * yazabilir. Tam geri alma, o başarılı yazmayı da silerdi —
     * kullanıcı Bugün'de not yazıp Planlama'ya geçip plan yazdığında
     * ve nottaki istek ağ hatasıyla düştüğünde, sunucuda duran plan
     * ekrandan kaybolurdu.
     */
    onError: (error, vars, context) => {
      qc.setQueryData<DayNote>(qk.note(vars.date), (current) => ({
        date: vars.date,
        note: context?.previous?.note ?? null,
        mood: context?.previous?.mood ?? null,
        plan: current?.plan ?? context?.previous?.plan ?? null,
      }));

      onError?.(
        error instanceof Error ? error.message : "Not kaydedilemedi",
      );
    },

    // Yeniden çekme YOK: kullanıcı yazmaya devam ediyor olabilir ve
    // sunucudan gelen yanıt imleci/metni geri sarardı. Optimistic
    // durum zaten doğru; hata olursa geri alınıyor.
  });
}

/**
 * Günün PLANINI kaydeder — Planlama ekranından.
 *
 * `useSaveDayNote`'un ikizi ama KESİŞMEYEN sütun yazar: o `note` ve
 * `mood`, bu yalnızca `plan`. Böylece iki ekran aynı satırı aynı anda
 * düzenlese bile birbirini ezmez.
 *
 * Silme koşulu simetriktir: plan boşaltıldığında not ve ruh hali de
 * yoksa satır kaldırılır.
 */
export function useSaveDayPlan(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, plan }: SavePlanVars) => {
      const supabase = createClient();
      const trimmed = plan?.trim() ? plan.trim() : null;

      if (trimmed === null) {
        const cached = qc.getQueryData<DayNote>(qk.note(date));
        const hasNote = Boolean(cached?.note?.trim());
        const hasMood = cached?.mood != null;

        if (!hasNote && !hasMood) {
          const { error } = await supabase
            .from("day_notes")
            .delete()
            .eq("date", date);
          if (error) throw error;
          return;
        }
      }

      const { error } = await supabase
        .from("day_notes")
        .upsert({ date, plan: trimmed }, { onConflict: "user_id,date" });
      if (error) throw error;
    },

    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: qk.note(vars.date) });
      const previous = qc.getQueryData<DayNote>(qk.note(vars.date));

      qc.setQueryData<DayNote>(qk.note(vars.date), {
        date: vars.date,
        // `note` ve `mood` KORUNUR — bu mutation onlara dokunmuyor.
        note: previous?.note ?? null,
        mood: previous?.mood ?? null,
        plan: vars.plan,
      });

      return { previous };
    },

    /* Simetrik geri alma — gerekçe için bkz. `useSaveDayNote.onError`. */
    onError: (error, vars, context) => {
      qc.setQueryData<DayNote>(qk.note(vars.date), (current) => ({
        date: vars.date,
        note: current?.note ?? context?.previous?.note ?? null,
        mood: current?.mood ?? context?.previous?.mood ?? null,
        plan: context?.previous?.plan ?? null,
      }));

      onError?.(error instanceof Error ? error.message : "Plan kaydedilemedi");
    },

    /*
     * Ay ızgarasındaki nokta haritası tazelenir — ama YALNIZCA yazma
     * bittiğinde. `qk.notePlansMonth` `qk.notes()` önekinin altında ve
     * önek eşleşmesi bunu ücretsiz yapıyor; yine de `qk.note(date)`
     * geçersiz kılınMAZ, çünkü kullanıcı hâlâ yazıyor olabilir ve
     * sunucudan gelen yanıt imleci geri sarardı (yukarıdaki aynı
     * gerekçe).
     */
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: qk.notes(),
        predicate: (query) => query.queryKey[1] === "month",
      });
    },
  });
}
