"use client";

import { cn } from "@/lib/ui/cn";
import type { PlanScale } from "./plan";

const SCALES: ReadonlyArray<{ value: PlanScale; label: string }> = [
  { value: "week", label: "Hafta" },
  { value: "month", label: "Ay" },
];

/**
 * Ölçek anahtarı: hafta mı, ay mı?
 *
 * Bağlantı DEĞİL düğme — `TakvimTabs`'ten ayrıldığı yer burası. Ölçek
 * bir sayfa değil, aynı sayfanın yakınlaşma seviyesidir; ayrı bir URL
 * vermek geri düğmesini "planlama yaparken kaç kez yakınlaştım"
 * geçmişiyle doldururdu.
 *
 * Görünüm `TakvimTabs`'in çip grubuyla aynı: iki kontrol üst üste
 * duracak, farklı görünmeleri ikisinin farklı şeyler yaptığını
 * düşündürürdü — oysa ikisi de "neye bakıyorum" sorusunu cevaplıyor.
 */
export function PlanScaleTabs({
  scale,
  onChange,
}: {
  scale: PlanScale;
  onChange: (scale: PlanScale) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Plan ölçeği"
      className="flex gap-1 rounded-lg bg-[var(--color-surface-2)] p-1"
    >
      {SCALES.map((item) => {
        const active = item.value === scale;

        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[length:var(--text-sm)]",
              "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
              active
                ? "bg-[var(--color-surface-3)] font-medium text-[var(--color-ink)]"
                : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
