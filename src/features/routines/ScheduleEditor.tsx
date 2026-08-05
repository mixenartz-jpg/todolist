"use client";

import type { IsoWeekday } from "@/lib/date/types";
import { WEEKDAYS_MIN, WEEKDAYS_LONG } from "@/lib/ui/tr";
import { cn } from "@/lib/ui/cn";
import type { Schedule, ScheduleKind } from "./types";

const KINDS: Array<{ kind: ScheduleKind; label: string; hint: string }> = [
  { kind: "daily", label: "Her gün", hint: "Her gün karşına çıkar" },
  { kind: "weekdays", label: "Belirli günler", hint: "Seçtiğin günlerde" },
  { kind: "flexible", label: "Esnek", hint: "Haftada/ayda N kez" },
];

const ALL_DAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

export function ScheduleEditor({
  value,
  onChange,
}: {
  value: Schedule;
  onChange: (schedule: Schedule) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
        Ne sıklıkla?
      </legend>

      <div className="flex gap-1.5">
        {KINDS.map(({ kind, label, hint }) => (
          <button
            key={kind}
            type="button"
            title={hint}
            onClick={() => onChange(defaultFor(kind))}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-[length:var(--text-sm)]",
              "transition-colors duration-[var(--duration-fast)]",
              value.kind === kind
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-ink-3)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {value.kind === "weekdays" && (
        <WeekdayPicker
          days={value.days}
          onChange={(days) => onChange({ kind: "weekdays", days })}
        />
      )}

      {value.kind === "flexible" && (
        <FlexiblePicker
          count={value.count}
          per={value.per}
          onChange={(count, per) => onChange({ kind: "flexible", count, per })}
        />
      )}
    </fieldset>
  );
}

function WeekdayPicker({
  days,
  onChange,
}: {
  days: IsoWeekday[];
  onChange: (days: IsoWeekday[]) => void;
}) {
  function toggle(day: IsoWeekday) {
    const next = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day].sort((a, b) => a - b);
    // En az bir gün seçili kalmalı, yoksa rutin hiç görünmez.
    if (next.length > 0) onChange(next);
  }

  return (
    <div className="flex gap-1">
      {ALL_DAYS.map((day) => (
        <button
          key={day}
          type="button"
          aria-pressed={days.includes(day)}
          aria-label={WEEKDAYS_LONG[day]}
          onClick={() => toggle(day)}
          className={cn(
            "flex h-9 flex-1 items-center justify-center rounded-md border",
            "text-[length:var(--text-sm)] transition-colors duration-[var(--duration-fast)]",
            days.includes(day)
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
              : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-3)] hover:border-[var(--color-ink-3)]",
          )}
        >
          {WEEKDAYS_MIN[day]}
        </button>
      ))}
    </div>
  );
}

function FlexiblePicker({
  count,
  per,
  onChange,
}: {
  count: number;
  per: "week" | "month";
  onChange: (count: number, per: "week" | "month") => void;
}) {
  const max = per === "week" ? 7 : 31;

  return (
    <div className="flex items-center gap-2">
      <select
        value={per}
        onChange={(e) => {
          const nextPer = e.target.value as "week" | "month";
          const limit = nextPer === "week" ? 7 : 31;
          onChange(Math.min(count, limit), nextPer);
        }}
        className="h-9 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface)] px-2 text-[length:var(--text-sm)]"
      >
        <option value="week">Haftada</option>
        <option value="month">Ayda</option>
      </select>

      <input
        type="number"
        min={1}
        max={max}
        value={count}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (next >= 1 && next <= max) onChange(next, per);
        }}
        className="tabular h-9 w-16 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface)] px-2 text-center text-[length:var(--text-sm)]"
      />

      <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
        kez
      </span>
    </div>
  );
}

function defaultFor(kind: ScheduleKind): Schedule {
  switch (kind) {
    case "daily":
      return { kind: "daily" };
    case "weekdays":
      return { kind: "weekdays", days: [1, 3, 5] };
    case "flexible":
      return { kind: "flexible", count: 3, per: "week" };
  }
}
