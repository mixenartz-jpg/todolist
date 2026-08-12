"use client";

import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import type { PlanGoal } from "./types";

interface GoalPickerProps {
  goals: readonly PlanGoal[];
  value: string | null;
  onChange: (goalId: string | null) => void;
  taskTitle: string;
}

/**
 * Görevin bağlı olduğu aylık hedefi seçer.
 *
 * `CategoryPicker`'ın ikizi ve aynı gerekçelerle native `<select>`.
 * Arşivlenmiş hedefler listede yoktur ama göreve atanmış olan arşivli
 * bir hedef geri eklenir — yoksa tarayıcı ilk seçeneğe düşer ve
 * kullanıcının bağını sessizce değiştirmiş gibi görünürdü.
 *
 * Liste YALNIZCA görüntülenen ayın hedeflerini içerir. Başka ayın
 * hedefine bağlamak anlamsız olurdu: hedef aya aittir ve o ayın
 * özetinde ölçülür.
 */
export function GoalPicker({
  goals,
  value,
  onChange,
  taskTitle,
}: GoalPickerProps) {
  const active = goals.filter((g) => g.archivedAt === null);
  const current = value === null ? null : goals.find((g) => g.id === value);

  const options =
    current && current.archivedAt !== null ? [...active, current] : active;

  if (options.length === 0) return null;

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{`${taskTitle}: aylık hedef`}</span>

      {current && (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: slotVar(current.colorSlot) }}
        />
      )}

      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : event.target.value)
        }
        className={cn(
          "max-w-28 rounded-md border border-[var(--color-line)] bg-[var(--color-surface-2)] px-1.5 py-1",
          "text-[length:var(--text-2xs)]",
          "transition-colors duration-[var(--duration-fast)]",
          current
            ? "text-[var(--color-ink-2)]"
            : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
        )}
      >
        <option value="">Hedefsiz</option>

        {options.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
            {g.archivedAt !== null ? " (arşiv)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
