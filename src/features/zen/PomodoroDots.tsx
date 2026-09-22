"use client";

import { cn } from "@/lib/ui/cn";
import { ROUNDS_BEFORE_LONG_BREAK, filledDots } from "./zen";

/**
 * Uzun molaya kaç tur kaldığını gösteren noktalar.
 *
 * ── Neden sayı değil nokta? ──
 * "2/4" okunmayı gerektiriyor; dolu/boş noktalar tek bakışta
 * anlaşılıyor. Odak ekranında okunacak tek şey sayaç olmalı.
 *
 * Bu bir EYLEM değil, DURUM bildirimi — `ZenScreen`'in "üçüncü
 * seçenek" kuralını ihlal etmiyor.
 */
export function PomodoroDots({ completedRounds }: { completedRounds: number }) {
  const filled = filledDots(completedRounds);

  return (
    <div className="flex items-center gap-2">
      {/*
        Noktalar `aria-hidden`: yanlarındaki metin ("tur 2/4") aynı
        bilgiyi zaten söylüyor ve ekran okuyucuya dört anlamsız öğe
        okutmak gürültü olurdu.
      */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: ROUNDS_BEFORE_LONG_BREAK }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              "transition-colors duration-[var(--duration-base)]",
              i < filled
                ? "bg-[var(--color-accent)]"
                : "bg-[var(--color-line-2)]",
            )}
          />
        ))}
      </div>

      <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        tur {filled}/{ROUNDS_BEFORE_LONG_BREAK}
      </span>
    </div>
  );
}
