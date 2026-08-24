"use client";

import { cn } from "@/lib/ui/cn";
import type { PlanViewMode } from "./usePlanViewMode";

interface PlanViewToggleProps {
  mode: PlanViewMode;
  onChange: (next: PlanViewMode) => void;
}

const OPTIONS: ReadonlyArray<{ value: PlanViewMode; label: string }> = [
  { value: "list", label: "Liste" },
  { value: "grid", label: "Izgara" },
];

/**
 * Haftalık planlamanın görünüm anahtarı.
 *
 * ── Neden `<nav>` DEĞİL? ──
 * `PlanlamaTabs`'ın segment diliyle aynı GÖRÜNÜR ama farklı bir şey
 * yapıyor: rota değiştirmiyor, aynı sayfanın gösterim biçimini
 * değiştiriyor. `<nav>` + `<Link>` kullanmak ekran okuyucuya "burada
 * gidilecek yerler var" derdi; oysa gidilecek bir yer yok, bir ayar
 * var. Bu yüzden `aria-pressed`li düğmeler.
 *
 * ── Neden başlığın `children` yuvasında? ──
 * `actions` yuvası dolu: "Bu hafta" + iki ok. Dar ekranda başlıkla
 * aynı satırda duruyorlar ve dördüncü bir kontrol sığmaz. `children`
 * tam genişlik bir şerit ve `CategoryFilterBar` zaten orada — iki
 * ayar yan yana, doğru yer.
 */
export function PlanViewToggle({ mode, onChange }: PlanViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Görünüm"
      className="flex shrink-0 items-center gap-0.5 rounded-lg bg-[var(--color-surface-2)] p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[length:var(--text-xs)]",
            "transition-colors duration-[var(--duration-fast)]",
            mode === option.value
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
