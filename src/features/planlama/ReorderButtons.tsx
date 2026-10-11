"use client";

import { cn } from "@/lib/ui/cn";

/**
 * Gün içinde sıra değiştirme: yukarı / aşağı.
 *
 * ── Neden YALNIZCA sürükle-bırak değil? ──
 * `DayPicker`'daki gerekçenin aynısı: sürükleme dokunmada sayfa
 * kaydırmasıyla çakışır, klavyeyle karşılığı yoktur ve ekran okuyucuya
 * hiçbir şey söylemez. İki düğme her girdi yönteminde aynı işi yapar;
 * fareyle sürükleme (Bugün, Planlama, Rutinler) bunun kısayoludur.
 *
 * Sınırdaki düğme GİZLENMEZ, devre dışı bırakılır: kaybolan bir
 * düğme satırın genişliğini değiştirir ve listedeki her satırda farklı
 * sayıda kontrol olurdu.
 */
export function ReorderButtons({
  title,
  isFirst,
  isLast,
  onMove,
  className = "mt-2",
}: {
  title: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (delta: -1 | 1) => void;
  /** Konum sınıfı; varsayılan başlığın altında duran satır. */
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Sırayı değiştir"
      className={cn("flex items-center gap-1", className)}
    >
      <ArrowButton
        label={`${title}: yukarı taşı`}
        disabled={isFirst}
        onClick={() => onMove(-1)}
        up
      />
      <ArrowButton
        label={`${title}: aşağı taşı`}
        disabled={isLast}
        onClick={() => onMove(1)}
      />
    </div>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  up = false,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  up?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-md",
        "text-[var(--color-ink-3)]",
        "transition-colors duration-[var(--duration-fast)]",
        "not-disabled:hover:bg-[var(--color-surface-3)] not-disabled:hover:text-[var(--color-ink-2)]",
        "disabled:opacity-30",
      )}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d={up ? "M8 12.5v-9M4.5 7L8 3.5 11.5 7" : "M8 3.5v9M4.5 9L8 12.5 11.5 9"}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
