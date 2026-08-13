"use client";

import { useState } from "react";
import type { DateStr } from "@/lib/date/types";
import { useDebouncedCallback } from "@/lib/ui/useDebouncedCallback";
import { useDayNote } from "./queries";
import { useSaveDayNote } from "./mutations";
import { MoodPicker } from "./MoodPicker";
import type { Mood } from "./types";

const AUTOSAVE_DELAY_MS = 800;

/**
 * Günün notu ve ruh hali.
 *
 * Not yazarken otomatik kaydedilir (yazma duraklayınca); mood
 * tıklandığı an. "Kaydet" düğmesi yok — günlük tutmak bir form
 * doldurma işi değil.
 */
export function DayNoteCard({
  date,
  onError,
}: {
  date: DateStr;
  onError?: (message: string) => void;
}) {
  const { data: dayNote } = useDayNote(date);
  const save = useSaveDayNote(onError);

  const [note, setNote] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);

  // Sunucu verisi yalnızca GÜN DEĞİŞTİĞİNDE yerel duruma alınır.
  // `dayNote`'u bağımlılığa koymak, kullanıcı yazarken gelen her
  // yanıtın metni geri sarmasına yol açardı — imleç zıplar, son
  // yazılan cümle kaybolur.
  const [loadedDate, setLoadedDate] = useState<DateStr | null>(null);
  if (dayNote !== undefined && loadedDate !== date) {
    setLoadedDate(date);
    setNote(dayNote.note ?? "");
    setMood(dayNote.mood ?? null);
  }

  const debouncedSave = useDebouncedCallback(
    (nextNote: string, nextMood: Mood | null) => {
      save.mutate({ date, note: nextNote, mood: nextMood });
    },
    AUTOSAVE_DELAY_MS,
  );

  function handleNoteChange(next: string) {
    setNote(next);
    debouncedSave.call(next, mood);
  }

  function handleMoodChange(next: Mood | null) {
    setMood(next);
    // Mood tek tıklık bir karar — beklemeye gerek yok.
    debouncedSave.cancel();
    save.mutate({ date, note, mood: next });
  }

  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <MoodPicker value={mood} onChange={handleMoodChange} />

      <textarea
        value={note}
        onChange={(e) => handleNoteChange(e.target.value)}
        onBlur={() => debouncedSave.flush()}
        maxLength={2000}
        rows={3}
        placeholder="Bugüne dair bir not…"
        className="mt-3 w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2.5 text-[length:var(--text-base)] leading-relaxed outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-line-3)]"
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
