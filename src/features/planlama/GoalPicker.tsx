"use client";

import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import { goalPickerOptions } from "./goaloptions";
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
  /*
   * Seçenek listesi ve "yetim bağ" kararı SAF fonksiyonda — üç durumun
   * gerekçesi ve testleri `goaloptions.ts` / `goaloptions.test.ts`'te.
   */
  const { options, current, orphan } = goalPickerOptions(goals, value);

  // Yalnızca yetim bağ varsa liste boş olsa bile seçici çizilmeli:
  // aksi halde bağı görmenin ve kaldırmanın hiçbir yolu kalmaz.
  if (options.length === 0 && !orphan) return null;

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

        {/* Başka aya ait bağ. Adı elimizde yok (o ayın hedefleri
            çekilmedi) ama bağın VARLIĞI gösterilmeli — seçili kalır,
            kullanıcı isterse "Hedefsiz"e alarak kaldırır. */}
        {orphan && value !== null && (
          <option value={value}>Başka ayın hedefi</option>
        )}

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
