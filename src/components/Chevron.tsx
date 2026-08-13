"use client";

import { cn } from "@/lib/ui/cn";

/**
 * Açılır/kapanır göstergesi — uygulamanın ortak açma ikonu.
 *
 * Yanlış defterinin ağacı, Bugün ekranındaki "Bir ara" bölümü ve
 * defterdeki not satırları aynı çizimi kullanır. Her yerin kendi okunu
 * çizmesi, aynı hareketi farklı gösteren bir arayüz üretirdi.
 *
 * `features/` altında DEĞİL: üç ayrı özellik kullanıyor ve birinin
 * diğerinden import etmesi özellik sınırını delerdi.
 *
 * Yön DEĞİL durum bildirir: kapalıyken sağa, açıkken aşağı bakar.
 * Sayfa çeviren ◀ ▶ okları (`WeekSwitcher`, `PlanlamaHeader`,
 * `MonthSwitcher`) bilerek ayrı kalır — onlar bir yöne gider, bu bir
 * şeyi açar.
 */
export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className={cn(
        "shrink-0 text-[var(--color-ink-3)]",
        "transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
        open && "rotate-90",
      )}
    >
      <path
        d="M4.5 2.5L8 6l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
