"use client";

import { useState } from "react";
import type { DateStr } from "@/lib/date/types";
import { useDebouncedCallback } from "@/lib/ui/useDebouncedCallback";
import { PERIOD_NOTE_MAX, usePeriodNote, useSavePeriodNote } from "./periodNotes";

const AUTOSAVE_DELAY_MS = 800;

interface PeriodNoteEditorProps {
  scale: "month" | "week";
  /** Ay → ayın 1'i, hafta → ISO pazartesisi. */
  periodStart: DateStr;
  /** Etiket; verilmezse "Haftanın amacı" / "Ayın amacı". */
  label?: string;
  onError?: (message: string) => void;
}

/**
 * Dönemin amacı — hedef kalemlerinin ÜSTÜNDE duran serbest metin (0025).
 *
 * Hedef kalemi ölçülür ("3 bölüm"); bu alan ölçülmez. "Bu hafta organik
 * kimya bitecek, denemelerin analizine ağırlık" gibi haftanın NEDEN'ini
 * tek paragrafta söylüyor. Hedefler bu cümlenin parçaları.
 *
 * `DayPlanEditor` ile aynı autosave deseni: "Kaydet" düğmesi yok,
 * sunucu verisi yalnızca DÖNEM DEĞİŞTİĞİNDE yerel duruma alınır —
 * yazarken gelen yanıt imleci geri sarmasın.
 */
export function PeriodNoteEditor({
  scale,
  periodStart,
  label: labelProp,
  onError,
}: PeriodNoteEditorProps) {
  const { data } = usePeriodNote(scale, periodStart);
  const save = useSavePeriodNote(onError);

  const [body, setBody] = useState("");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const key = `${scale}:${periodStart}`;
  if (data !== undefined && loadedKey !== key) {
    setLoadedKey(key);
    setBody(data.body);
  }

  /*
   * Dönem ÇAĞRIYLA taşınıyor, kapanıştan okunmuyor: hafta okla
   * değişirken bekleyen bir yazma, en güncel kapanışla çalışıp eski
   * haftanın metnini YENİ haftaya yazardı.
   */
  const debouncedSave = useDebouncedCallback(
    (start: DateStr, next: string) => {
      save.mutate({ scale, periodStart: start, body: next });
    },
    AUTOSAVE_DELAY_MS,
  );

  const label = labelProp ?? (scale === "week" ? "Haftanın amacı" : "Ayın amacı");

  return (
    <div className="mb-3">
      <label className="block">
        <span className="mb-1 block text-[length:var(--text-xs)] font-medium text-[var(--color-ink-2)]">
          {label}
        </span>
        <textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            debouncedSave.call(periodStart, event.target.value);
          }}
          onBlur={() => debouncedSave.flush()}
          maxLength={PERIOD_NOTE_MAX}
          rows={3}
          placeholder={
            scale === "week"
              ? "Bu hafta ne bitecek? Neye ağırlık vereceksin…"
              : "Bu ay neyi başarmak istiyorsun…"
          }
          className="w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2.5 text-[length:var(--text-sm)] leading-relaxed outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-line-3)]"
        />
      </label>

      <p
        aria-live="polite"
        className="mt-1 h-4 text-[length:var(--text-xs)] text-[var(--color-ink-3)]"
      >
        {save.isPending ? "Kaydediliyor…" : save.isSuccess ? "Kaydedildi" : ""}
      </p>
    </div>
  );
}
