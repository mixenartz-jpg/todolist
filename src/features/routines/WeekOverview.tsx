"use client";

import { todayStr } from "@/lib/date/date";
import type { IsoWeekday } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import { WEEKDAYS_SHORT } from "@/lib/ui/tr";
import { routinesByWeekday, scheduleWeekdays } from "./schedule";
import type { RoutineWithSchedule, Schedule } from "./types";

const ALL_DAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * Rutin eklerken/düzenlerken haftanın her gününde hangi rutinlerin
 * olduğunu gösterir. Formdaki taslak rutin, seçili programına göre
 * ilgili günlerde vurgulu çip olarak belirir — yükü dengelemek için.
 */
export function WeekOverview({
  routines,
  draft,
}: {
  /** Mevcut rutinler (düzenlenen rutin hariç). */
  routines: readonly RoutineWithSchedule[];
  draft: { name: string; colorSlot: number; schedule: Schedule };
}) {
  const { byDay, flexible } = routinesByWeekday(routines, todayStr());
  const draftDays = new Set(scheduleWeekdays(draft.schedule));
  const draftName = draft.name.trim() || "Bu rutin";

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
        Haftalık görünüm
      </h3>
      <ul className="flex flex-col divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)]">
        {ALL_DAYS.map((day) => {
          const items = byDay[day];
          const withDraft = draftDays.has(day);
          return (
            <li key={day} className="flex items-start gap-2 px-2.5 py-1.5">
              <span className="w-9 shrink-0 pt-0.5 text-[length:var(--text-xs)] font-medium text-[var(--color-ink-3)]">
                {WEEKDAYS_SHORT[day]}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                {items.length === 0 && !withDraft && (
                  <span className="pt-0.5 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                    Boş
                  </span>
                )}
                {items.map((r) => (
                  <Chip key={r.id} name={r.name} colorSlot={r.colorSlot} />
                ))}
                {withDraft && (
                  <Chip name={draftName} colorSlot={draft.colorSlot} highlight />
                )}
              </span>
              <span className="tabular shrink-0 pt-0.5 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                {items.length + (withDraft ? 1 : 0)}
              </span>
            </li>
          );
        })}
      </ul>
      {(flexible.length > 0 || draft.schedule.kind === "flexible") && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            Esnek (sabit günü yok):
          </span>
          {flexible.map((r) => (
            <Chip key={r.id} name={r.name} colorSlot={r.colorSlot} />
          ))}
          {draft.schedule.kind === "flexible" && (
            <Chip name={draftName} colorSlot={draft.colorSlot} highlight />
          )}
        </div>
      )}
    </section>
  );
}

function Chip({
  name,
  colorSlot,
  highlight = false,
}: {
  name: string;
  colorSlot: number;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[length:var(--text-xs)]",
        highlight
          ? "border-dashed border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
          : "border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-ink-2)]",
      )}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: slotVar(colorSlot) }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
