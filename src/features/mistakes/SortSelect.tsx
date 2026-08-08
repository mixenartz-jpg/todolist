"use client";

import { cn } from "@/lib/ui/cn";
import { SORT_MODES, type SortMode } from "./sort";

interface SortSelectProps {
  value: SortMode;
  onChange: (mode: SortMode) => void;
}

/**
 * Ağacın sıralama modu seçicisi.
 *
 * `<select>` yerine görünür düğmeler: üç seçenek var ve hepsi tek
 * bakışta okunabiliyor. Açılır liste, mevcut modu görmek için bile
 * tıklama isterdi.
 *
 * `aria-pressed` kullanılır, `role="radiogroup"` değil: bunlar bir form
 * değeri değil, görünümü değiştiren aç/kapa düğmeleridir.
 */
export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        id="sort-label"
        className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]"
      >
        Sırala
      </span>

      <div
        role="group"
        aria-labelledby="sort-label"
        className="flex gap-0.5 rounded-lg bg-[var(--color-surface-2)] p-0.5"
      >
        {SORT_MODES.map((mode) => {
          const active = mode.value === value;

          return (
            <button
              key={mode.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(mode.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[length:var(--text-xs)]",
                "transition-[color,background-color] duration-[var(--duration-fast)]",
                active
                  ? "bg-[var(--color-surface-3)] font-medium text-[var(--color-ink)]"
                  : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
              )}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
