"use client";

import { Button } from "@/components/Button";
import { addDays } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatWeekRange } from "@/lib/ui/tr";

interface WeekSwitcherProps {
  weekStart: DateStr;
  onChange: (weekStart: DateStr) => void;
  onThisWeek: () => void;
  isCurrentWeek: boolean;
}

/**
 * Hafta gezinme başlığı.
 *
 * `MonthSwitcher` ile birebir aynı düzen ve aynı kural: "Bu hafta"
 * düğmesi yalnızca başka bir haftadayken görünür. Mevcut haftadayken
 * göstermek, hiçbir şey yapmayan bir düğme sunmak olurdu.
 */
export function WeekSwitcher({
  weekStart,
  onChange,
  onThisWeek,
  isCurrentWeek,
}: WeekSwitcherProps) {
  return (
    <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3 md:px-5">
      <h1 className="mr-auto text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
        {formatWeekRange(weekStart, addDays(weekStart, 6))}
      </h1>

      {!isCurrentWeek && (
        <Button size="sm" variant="ghost" onClick={onThisWeek}>
          Bu hafta
        </Button>
      )}

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          aria-label="Önceki hafta"
          onClick={() => onChange(addDays(weekStart, -7))}
          className="px-2"
        >
          <Chevron direction="left" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Sonraki hafta"
          onClick={() => onChange(addDays(weekStart, 7))}
          className="px-2"
        >
          <Chevron direction="right" />
        </Button>
      </div>
    </header>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={direction === "left" ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
