"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/ui/cn";
import { SLOT_HEX, SLOT_NAMES } from "@/lib/ui/colors";
import { ScheduleEditor } from "./ScheduleEditor";
import type { RoutineDraft, Schedule } from "./types";

interface RoutineFormProps {
  initial?: Partial<RoutineDraft>;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (draft: RoutineDraft) => void;
  onCancel: () => void;
}

export function RoutineForm({
  initial,
  submitLabel,
  pending = false,
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      icon: null,
      colorSlot,
      target: hasTarget ? Math.max(1, target) : 1,
      unit: hasTarget && unit.trim() ? unit.trim() : null,
      schedule,
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
