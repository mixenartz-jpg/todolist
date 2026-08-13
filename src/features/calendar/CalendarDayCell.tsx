"use client";

import { memo } from "react";
import { toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { levelVar } from "@/lib/ui/colors";
import { formatLongDate, formatPercent } from "@/lib/ui/tr";
import { densityLevel, type DayScore } from "@/features/stats/score";

interface CalendarDayCellProps {
  date: DateStr;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  score: DayScore;
  hasTask: boolean;
  onSelect: () => void;
}

export const CalendarDayCell = memo(function CalendarDayCell({
  date,
  inMonth,
  isToday,
  isFuture,
  score,
  hasTask,
  onSelect,
}: CalendarDayCellProps) {
  const { day } = toParts(date);

  // Gelecek günlerin skoru anlamsızdır: yapılacak bir şey henüz
  // olmadığı için hepsi %0 çıkar ve "boş gün" gibi görünürdü.
  const showDensity = !isFuture && score.possible > 0;
  const level = densityLevel(score.ratio);

  return (
    <button
      type="button"
      role="gridcell"
      onClick={onSelect}
      aria-label={
        showDensity
          ? `${formatLongDate(date)}: ${formatPercent(score.ratio)}`
          : formatLongDate(date)
      }
      className={cn(
        "calendarDay",
        !inMonth && "calendarDayOutside",
        isToday && "calendarDayToday",
        isFuture && "calendarDayFuture",
      )}
    >
      {hasTask && <span className="calendarTaskDot" aria-hidden />}

      <span
        className={cn(
          "calendarDayNumber",
          isToday
            ? "font-semibold text-[var(--color-accent)]"
            : "text-[var(--color-ink-2)]",
        )}
      >
        {day}
      </span>

      {showDensity && (
        <span
          className="calendarDensity"
          style={{
            background: levelVar(level),
            // Açık uçlarda koyu metin, koyu uçlarda açık metin.
            // `--color-on-accent` = "açık dolgu üstündeki mürekkep".
            color:
              level >= 3 ? "var(--color-on-accent)" : "var(--color-ink-2)",
          }}
          aria-hidden
        >
          {Math.round(score.ratio * 100)}
        </span>
      )}
    </button>
  );
});
