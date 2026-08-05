"use client";

import { isoWeekday, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { WEEKDAYS_MIN } from "@/lib/ui/tr";
import { cn } from "@/lib/ui/cn";

/** Gün numarası + hafta günü başlık satırı. */
export function MatrixHeader({
  days,
  today,
}: {
  days: DateStr[];
  today: DateStr;
}) {
  return (
    <>
      <div className="cornerCell flex h-11 items-end pb-1.5 pl-3">
        <span className="text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--color-ink-3)]">
          Rutin
        </span>
      </div>

      {days.map((date) => {
        const { day } = toParts(date);
        const weekday = isoWeekday(date);
        const isToday = date === today;

        return (
          <div
            key={date}
            role="columnheader"
            className={cn(
              "headerCell flex h-11 flex-col items-center justify-end gap-0.5 pb-1.5",
              "border-r border-b border-[var(--color-line)]",
              isToday && "todayColumn todayHeader",
              isoWeekday(date) === 1 && "weekStart",
              weekday >= 6 && !isToday && "weekend",
            )}
          >
            <span
              className={cn(
                "text-[length:var(--text-2xs)] leading-none",
                isToday ? "text-[var(--color-accent)]" : "text-[var(--color-ink-3)]",
              )}
            >
              {WEEKDAYS_MIN[weekday]}
            </span>
            <span
              className={cn(
                "tabular text-[length:var(--text-xs)] leading-none",
                isToday
                  ? "font-semibold text-[var(--color-accent)]"
                  : "text-[var(--color-ink-2)]",
              )}
            >
              {day}
            </span>
          </div>
        );
      })}
    </>
  );
}
