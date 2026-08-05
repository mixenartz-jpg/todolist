"use client";

import { Button } from "@/components/Button";
import { formatMonthYear } from "@/lib/ui/tr";

interface MonthSwitcherProps {
  year: number;
  month: number;
  onChange: (value: { year: number; month: number }) => void;
  onToday: () => void;
  isCurrentMonth: boolean;
}

export function MonthSwitcher({
  year,
  month,
  onChange,
  onToday,
  isCurrentMonth,
}: MonthSwitcherProps) {
  return (
    <header className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3 md:px-5">
      <h1 className="mr-auto text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
        {formatMonthYear(year, month)}
      </h1>

      {!isCurrentMonth && (
        <Button size="sm" variant="ghost" onClick={onToday}>
          Bugün
        </Button>
      )}

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          aria-label="Önceki ay"
          onClick={() => onChange(shift(year, month, -1))}
          className="px-2"
        >
          <Chevron direction="left" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Sonraki ay"
          onClick={() => onChange(shift(year, month, 1))}
          className="px-2"
        >
          <Chevron direction="right" />
        </Button>
      </div>
    </header>
  );
}

function shift(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
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
