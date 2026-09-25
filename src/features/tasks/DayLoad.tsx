"use client";

import { cn } from "@/lib/ui/cn";
import { dayLoad, formatEstimate } from "./estimate";
import type { Task } from "./types";

/**
 * Günün tahmini yükü: ne kadar çalışıldı, ne kadar planlandı.
 *
 *   "2 saat çalışıldı / 5,5 saat · odak 1 sa 20 dak"
 *
 * "Çalışıldı" BİTMİŞ görevlerin tahminlerinin toplamıdır (bkz.
 * `dayLoad`). Odak süresi verilirse yanına eklenir: o, sayacın
 * ölçtüğü GERÇEK süre — ikisi farklı sorular ve biri ötekinin yerine
 * geçmiyor.
 *
 * `compact`: Planlama'nın gün satırı için kısa biçim ("2 / 5,5 saat").
 * Hiç tahmin ve odak yoksa hiçbir şey çizmez.
 */
export function DayLoad({
  tasks,
  focusSeconds,
  compact = false,
  className,
}: {
  tasks: readonly Task[];
  focusSeconds?: number;
  compact?: boolean;
  className?: string;
}) {
  const load = dayLoad(tasks);
  const focusMinutes =
    focusSeconds === undefined ? 0 : Math.floor(focusSeconds / 60);

  if (load === null && focusMinutes === 0) return null;

  const ratio = load && load.planned > 0 ? load.done / load.planned : 0;

  const label = [
    load &&
      `Tahmini ${formatEstimate(load.planned)} işin ${
        load.done > 0 ? formatEstimate(load.done) : "hiçbiri"
      } tamamlandı`,
    focusMinutes > 0 && `odak süresi ${formatEstimate(focusMinutes)}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "tabular inline-flex items-center gap-x-2",
        // Uzun biçim dar ekranda SARAR (390px'de başlıkla aynı satıra
        // sığmıyor); parçalar kendi içinde bölünmez.
        compact
          ? "whitespace-nowrap text-[length:var(--text-2xs)]"
          : "flex-wrap justify-end gap-y-0.5 text-[length:var(--text-xs)] [&>span]:whitespace-nowrap",
        "text-[var(--color-ink-3)]",
        className,
      )}
    >
      {load && (
        <>
          {/* İnce çubuk: oran sayıdan önce okunur. */}
          <span
            aria-hidden
            className={cn(
              "relative h-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]",
              compact ? "w-8" : "w-12",
            )}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-accent)]"
              style={{ width: `${Math.round(Math.min(1, ratio) * 100)}%` }}
            />
          </span>
          <span aria-hidden>
            {compact ? (
              <>
                {load.done > 0 ? `${formatEstimate(load.done)} / ` : ""}
                {formatEstimate(load.planned)}
              </>
            ) : (
              <>
                <span className="text-[var(--color-ink-2)]">
                  {load.done > 0 ? formatEstimate(load.done) : "0 dak"} çalışıldı
                </span>
                {" / "}
                {formatEstimate(load.planned)}
              </>
            )}
          </span>
        </>
      )}
      {focusMinutes > 0 && (
        <span aria-hidden>
          {load && "· "}odak {formatEstimate(focusMinutes)}
        </span>
      )}
    </span>
  );
}
