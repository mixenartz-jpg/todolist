"use client";

import { cn } from "@/lib/ui/cn";
import type { PlanScale } from "./range";

interface PlanScaleToggleProps {
  value: PlanScale;
  onChange: (next: PlanScale) => void;
}

const OPTIONS: ReadonlyArray<{ value: PlanScale; label: string }> = [
  { value: "month", label: "Ay" },
  { value: "week", label: "Hafta" },
];

/**
 * Plan yüzeyinin ölçek anahtarı: Ay ⇄ Hafta.
 *
 * ── Neden sekme DEĞİL? ──
 * Önce `/planlama/ay` ve `/planlama/hafta` ayrı rotalardı ve alt sekme
 * çubuğunda duruyorlardı. Ama ikisi ayrı EKRAN değil, aynı ekranın iki
 * ölçeği: aynı satırı, aynı davranışla, farklı aralıkta çiziyorlar.
 * Sekme "başka bir yere git" der; bu ise "aynı yere başka ölçekte bak".
 *
 * ── Neden `<nav>` DEĞİL? ──
 * Rota değiştirmiyor, aynı sayfanın gösterim aralığını değiştiriyor.
 * `<nav>` + `<Link>` ekran okuyucuya "burada gidilecek yerler var"
 * derdi; oysa gidilecek bir yer yok, bir ayar var. Bu yüzden
 * `aria-pressed`li düğmeler.
 *
 * ── Neden başlığın `children` yuvasında? ──
 * `actions` yuvası dolu: "Bu ay" + iki ok. Dar ekranda başlıkla aynı
 * satırda duruyorlar ve dördüncü bir kontrol sığmaz. `children` tam
 * genişlik bir şerit ve `CategoryFilterBar` zaten orada — iki ayar yan
 * yana, doğru yer.
 */
export function PlanScaleToggle({ value, onChange }: PlanScaleToggleProps) {
  return (
    <div
      role="group"
      aria-label="Ölçek"
      className="flex shrink-0 items-center gap-0.5 rounded-lg bg-[var(--color-surface-2)] p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[length:var(--text-xs)]",
            "transition-colors duration-[var(--duration-fast)]",
            value === option.value
              ? "bg-[var(--color-surface-3)] text-[var(--color-ink)]"
              : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
