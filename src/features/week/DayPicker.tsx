"use client";

import { addDays } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { isoWeekday } from "@/lib/date/date";
import { WEEKDAYS_MIN } from "@/lib/ui/tr";

interface DayPickerProps {
  weekStart: DateStr;
  /** Görevin şu anki günü — seçili çip. */
  current: DateStr;
  onPick: (date: DateStr) => void;
}

/**
 * Haftanın yedi günü, çip olarak.
 *
 * ── Neden SÜRÜKLE-BIRAK DEĞİL? ──
 * Bir görevi başka güne taşımak nadir bir eylemdir; sürükle-bırak ise
 * dokunma, klavye ve odak yönetimi açısından geniş bir yüzeydir ve
 * ekran okuyucuya karşılığı olmayan bir etkileşim doğurur. Yedi çip
 * hem tek dokunuşluk hem klavyeyle gezilebilir.
 *
 * ── Neden yalnızca bu hafta? ──
 * Panel haftalık ızgaranın içinde açılıyor ve oradaki soru "bu görevi
 * haftanın hangi gününe koyayım". Rastgele bir tarihe taşımak takvim
 * ekranının işidir; buraya bir tarih seçici koymak, küçük bir panelde
 * ikinci bir takvim açmak olurdu.
 */
export function DayPicker({ weekStart, current, onPick }: DayPickerProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Görevi taşı">
      {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => {
        const selected = date === current;

        return (
          <button
            key={date}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(date)}
            className={cn(
              "h-7 min-w-8 rounded-md px-1.5 text-[length:var(--text-xs)]",
              "transition-colors duration-[var(--duration-fast)]",
              selected
                ? "bg-[color-mix(in_oklch,var(--color-accent)_18%,transparent)] text-[var(--color-ink)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
            )}
          >
            {WEEKDAYS_MIN[isoWeekday(date)]}
          </button>
        );
      })}
    </div>
  );
}
