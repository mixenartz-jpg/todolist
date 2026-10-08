"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/ui/cn";
import { SLOT_HEX, SLOT_NAMES } from "@/lib/ui/colors";
import { endOfIsoWeek, todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatShortDate } from "@/lib/ui/tr";
import { ScheduleEditor } from "./ScheduleEditor";
import { WeekOverview } from "./WeekOverview";
import type { RoutineDraft, RoutineWithSchedule, Schedule } from "./types";

/**
 * Rutinin süresi (0026).
 *
 *   none : süresiz — arşivlenene kadar sürer (eski davranış).
 *   week : yalnızca bu hafta; bu haftanın pazarı SON gün.
 *   date : kullanıcının seçtiği güne kadar (dahil).
 */
type Duration = "none" | "week" | "date";

function initialDuration(endDate: DateStr | null | undefined, weekEnd: DateStr): Duration {
  if (!endDate) return "none";
  return endDate === weekEnd ? "week" : "date";
}

interface RoutineFormProps {
  initial?: Partial<RoutineDraft>;
  submitLabel: string;
  pending?: boolean;
  /** Haftalık görünümde gösterilecek diğer rutinler (düzenlenen hariç). */
  otherRoutines?: readonly RoutineWithSchedule[];
  onSubmit: (draft: RoutineDraft) => void;
  onCancel: () => void;
}

export function RoutineForm({
  initial,
  submitLabel,
  pending = false,
  otherRoutines = [],
  onSubmit,
  onCancel,
}: RoutineFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [colorSlot, setColorSlot] = useState(initial?.colorSlot ?? 0);
  const [schedule, setSchedule] = useState<Schedule>(
    initial?.schedule ?? { kind: "daily" },
  );
  const [hasTarget, setHasTarget] = useState((initial?.target ?? 1) > 1);
  const [target, setTarget] = useState(initial?.target ?? 1);
  const [unit, setUnit] = useState(initial?.unit ?? "");

  const today = todayStr();
  const weekEnd = endOfIsoWeek(today);
  const [duration, setDuration] = useState<Duration>(() =>
    initialDuration(initial?.endDate, weekEnd),
  );
  const [untilDate, setUntilDate] = useState<string>(
    initial?.endDate ?? weekEnd,
  );
  // Geçmiş bir güne bitiş, rutini oluşturulduğu an bitmiş yapardı.
  const untilInvalid = duration === "date" && (!untilDate || untilDate < today);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || untilInvalid) return;

    onSubmit({
      name: name.trim(),
      icon: null,
      colorSlot,
      target: hasTarget ? Math.max(1, target) : 1,
      unit: hasTarget && unit.trim() ? unit.trim() : null,
      schedule,
      endDate:
        duration === "none"
          ? null
          : duration === "week"
            ? weekEnd
            : (untilDate as DateStr),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Rutin adı
        </span>
        <input
          autoFocus
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sabah sporu"
          className="h-10 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 text-[length:var(--text-base)] outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-line-3)]"
        />
      </label>

      <ScheduleEditor value={schedule} onChange={setSchedule} />

      <WeekOverview
        routines={otherRoutines}
        draft={{ name, colorSlot, schedule }}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Süre
        </legend>
        {(
          [
            ["none", "Süresiz"],
            ["week", `Sadece bu hafta (${formatShortDate(weekEnd)} Pazar'a kadar)`],
            ["date", "Belirli bir güne kadar"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="routine-duration"
              checked={duration === value}
              onChange={() => setDuration(value)}
              className="size-4 accent-[var(--color-accent)]"
            />
            <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              {label}
            </span>
          </label>
        ))}
        {duration === "date" && (
          <div className="pl-6">
            <input
              type="date"
              value={untilDate}
              min={today}
              onChange={(e) => setUntilDate(e.target.value)}
              aria-invalid={untilInvalid}
              aria-label="Son gün"
              className="tabular h-9 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface)] px-2 text-[length:var(--text-sm)]"
            />
            {untilInvalid && (
              <p role="alert" className="mt-1 text-[length:var(--text-xs)] text-[var(--color-warn)]">
                Bugün ya da sonrası bir gün seç.
              </p>
            )}
          </div>
        )}
        {duration !== "none" && (
          <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            Son günden sonra rutin bugün ekranında çıkmaz; geçmiş kayıtları
            ve istatistikleri korunur.
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-2.5">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasTarget}
            onChange={(e) => {
              setHasTarget(e.target.checked);
              if (!e.target.checked) setTarget(1);
              else if (target <= 1) setTarget(8);
            }}
            className="size-4 accent-[var(--color-accent)]"
          />
          <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            Sayısal hedef (örn. 8 bardak su, 30 sayfa)
          </span>
        </label>

        {hasTarget && (
          <div className="flex items-center gap-2 pl-6">
            <input
              type="number"
              min={1}
              step="any"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="tabular h-9 w-20 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface)] px-2 text-center text-[length:var(--text-sm)]"
            />
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              maxLength={16}
              placeholder="bardak"
              className="h-9 w-32 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface)] px-2 text-[length:var(--text-sm)] placeholder:text-[var(--color-ink-3)]"
            />
          </div>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Renk
        </legend>
        <div className="flex gap-1.5">
          {SLOT_HEX.map((hex, slot) => (
            <button
              key={slot}
              type="button"
              aria-label={SLOT_NAMES[slot]}
              aria-pressed={colorSlot === slot}
              onClick={() => setColorSlot(slot)}
              className={cn(
                "size-7 rounded-full transition-transform duration-[var(--duration-fast)]",
                colorSlot === slot
                  ? "ring-2 ring-[var(--color-ink)] ring-offset-2 ring-offset-[var(--color-bg)]"
                  : "hover:scale-110",
              )}
              style={{ background: hex }}
            />
          ))}
        </div>
      </fieldset>

      <div className="mt-1 flex gap-2">
        <Button type="submit" variant="primary" loading={pending}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
