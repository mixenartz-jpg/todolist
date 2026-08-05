"use client";

import { memo } from "react";
import type { DateStr } from "@/lib/date/types";
import type { EntryMap } from "@/features/entries/entry-map";
import { describeSchedule, scheduleAt } from "@/features/routines/schedule";
import type { RoutineWithSchedule } from "@/features/routines/types";
import { periodProgress } from "@/features/stats/score";
import { slotVar } from "@/lib/ui/colors";

/**
 * Sabit sol sütun: rutin adı, rengi ve — esnekse — dönem ilerlemesi.
 *
 * Esnek rutinlerde "2/3" rozeti kritik: o rutinin hiçbir günü zorunlu
 * olmadığı için satıra bakarak nerede olduğunu anlamanın başka yolu yok.
 */
export const MatrixNameCell = memo(function MatrixNameCell({
  routine,
  entries,
  today,
}: {
  routine: RoutineWithSchedule;
  entries: EntryMap;
  today: DateStr;
}) {
  const schedule = scheduleAt(routine, today);
  const progress = periodProgress(entries, routine, today);

  return (
    <div
      role="rowheader"
      className="nameCell flex h-[var(--row-h)] items-center gap-2 border-b border-[var(--color-line)] pl-3 pr-2"
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ background: slotVar(routine.colorSlot) }}
      />

      <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)] text-[var(--color-ink)]">
        {routine.name}
      </span>

      {progress ? (
        <span
          className="tabular shrink-0 rounded px-1.5 py-0.5 text-[length:var(--text-2xs)] leading-none"
          style={{
            background: progress.complete
              ? `color-mix(in oklch, ${slotVar(routine.colorSlot)} 22%, transparent)`
              : "var(--color-surface-3)",
            color: progress.complete
              ? slotVar(routine.colorSlot)
              : "var(--color-ink-3)",
          }}
          title={`Bu ${progress.per === "week" ? "hafta" : "ay"}: ${progress.done}/${progress.target}`}
        >
          {progress.done}/{progress.target}
        </span>
      ) : (
        schedule?.kind === "weekdays" && (
          <span
            className="shrink-0 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]"
            title={describeSchedule(schedule)}
          >
            {schedule.days.length}g
          </span>
        )
      )}
    </div>
  );
});
