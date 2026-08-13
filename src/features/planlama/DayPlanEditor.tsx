"use client";

import { useState } from "react";
import type { DateStr } from "@/lib/date/types";
import { useDebouncedCallback } from "@/lib/ui/useDebouncedCallback";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { useSaveDayPlan } from "@/features/notes/mutations";
import { useDayNote } from "@/features/notes/queries";

const AUTOSAVE_DELAY_MS = 800;
/** DB kısıtı (0008): plan en fazla 4000 karakter. */
const PLAN_MAX = 4000;

/**
 * Günün planı — serbest metin.
 *
 * `DayNoteCard` ile AYNI autosave deseni ("Kaydet" düğmesi yok; plan
 * yazmak bir form doldurma işi değil) ama AYRI bir alan yazar:
 * `day_notes.plan`. Gerekçe migration 0008'de — kısaca, günün planı
 * İLERİYE dönüktür ("şunları yapacağım"), gün notu GERİYE ("nasıl
 * geçti") ve ikisi tek alanda tutulsaydı akşam yazılan not sabahki
 * planı ezerdi.
 *
 * İki mutation kesişmeyen sütun kümeleri yazdığı için Bugün ekranı ve
 * bu panel aynı satırı aynı anda düzenleyebilir.
 */
export function DayPlanEditor({
  date,
  onError,
}: {
  date: DateStr;
  onError?: (message: string) => void;
}) {
  const { data: dayNote } = useDayNote(date);
  const save = useSaveDayPlan(onError);

  const [plan, setPlan] = useState("");

  /*
   * Sunucu verisi yalnızca GÜN DEĞİŞTİĞİNDE yerel duruma alınır.
   * `dayNote`'u bir efektin bağımlılığına koymak, kullanıcı yazarken
   * gelen her yanıtın metni geri sarmasına yol açardı — imleç zıplar,
   * son cümle kaybolur (DayNoteCard'daki aynı gerekçe).
   */
  const [loadedDate, setLoadedDate] = useState<DateStr | null>(null);
  if (dayNote !== undefined && loadedDate !== date) {
    setLoadedDate(date);
    setPlan(dayNote.plan ?? "");
  }

  const debouncedSave = useDebouncedCallback((next: string) => {
    save.mutate({ date, plan: next });
  }, AUTOSAVE_DELAY_MS);

  return (
    <section>
      <SectionHeading sectionKey="planlama.dayPlan" onError={onError} />

      <textarea
        value={plan}
        onChange={(event) => {
          setPlan(event.target.value);
          debouncedSave.call(event.target.value);
        }}
        // Panel kapanmadan önce bekleyen yazma zorlanır: `flush`
        // olmasaydı son 800ms'lik yazı kaydedilmeden kaybolurdu.
        onBlur={() => debouncedSave.flush()}
        maxLength={PLAN_MAX}
        rows={4}
        placeholder="Bugün ne yapacaksın? Sabah kütüphane, akşam tekrar…"
        className="w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2.5 text-[length:var(--text-base)] leading-relaxed outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-line-3)]"
      />

      <p
        aria-live="polite"
        className="mt-1.5 h-4 text-[length:var(--text-xs)] text-[var(--color-ink-3)]"
      >
        {save.isPending ? "Kaydediliyor…" : save.isSuccess ? "Kaydedildi" : ""}
      </p>
    </section>
  );
}
