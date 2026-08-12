"use client";

import { slotVar } from "@/lib/ui/colors";
import { formatDuration } from "@/features/tasks/schedule";
import { formatPercent } from "@/lib/ui/tr";
import type { CategorySlice } from "./rollup";

/**
 * Kategori dağılımı — yatay çubuklar.
 *
 * ── Neden pasta grafiği değil? ──
 * Pasta dilimlerinin açılarını karşılaştırmak, çubukların uzunluklarını
 * karşılaştırmaktan ölçülebilir biçimde daha zordur; sekiz kategoride
 * yakın iki dilim ayırt edilemez olurdu. Çubuk ayrıca kategori adını
 * ve sayıyı doğrudan yanına yazmaya izin verir — renk tek başına bilgi
 * taşımaz.
 *
 * Payların toplamı 1'dir; bu garanti şemadan gelir (görev başına tek
 * kategori) ve `rollup.test.ts` onu koruyor.
 */
export function CategoryBreakdown({
  slices,
}: {
  slices: readonly CategorySlice[];
}) {
  if (slices.length === 0) {
    return (
      <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        Bu ay hiç iş yok.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {slices.map((slice) => {
        const name = slice.category?.name ?? "Etiketsiz";
        const color = slice.category
          ? slotVar(slice.category.colorSlot)
          : "var(--color-ink-3)";

        return (
          <li key={slice.category?.id ?? "none"}>
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)]">
                {name}
              </span>

              <span className="tabular shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
                {slice.taskDone}/{slice.taskTotal}
              </span>

              <span className="tabular w-10 shrink-0 text-right text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                {formatPercent(slice.share)}
              </span>
            </div>

            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
              role="img"
              /* Çubuk `aria-label` taşır: görsel uzunluk bir bilgi ve
                 ekran okuyucu onu da duymalı. */
              aria-label={`${name}: ${slice.taskTotal} iş, ayın ${formatPercent(slice.share)}'si`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${slice.share * 100}%`,
                  background: color,
                }}
              />
            </div>

            {/* Süre yalnızca saatli işlerden gelir; sıfırsa hiç
                yazılmaz — "0 dk" bir bilgi değil, gürültü. */}
            {slice.minutes > 0 && (
              <p className="mt-0.5 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                {formatDuration(slice.minutes)} planlandı
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
