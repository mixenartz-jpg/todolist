/**
 * İstatistik tarih aralıkları.
 *
 * Tek bir filtre satırı tüm grafikleri kapsar — grafik başına ayrı
 * filtre, kartların birbirinden farklı dönemleri göstermesine ve
 * karşılaştırmanın anlamsızlaşmasına yol açar.
 */

import { addDays, fromParts, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";

export type RangeKey = "30g" | "90g" | "yil" | "tum";

export const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "30g", label: "30 gün" },
  { key: "90g", label: "90 gün" },
  { key: "yil", label: "Bu yıl" },
  { key: "tum", label: "Tümü" },
];

/**
 * Aralığın başlangıcı. Bitişi daima bugündür.
 *
 * "Tümü" için en eski rutin başlangıcı kullanılır; yoksa bir yıl geri.
 */
export function rangeStart(
  key: RangeKey,
  today: DateStr,
  earliestStart: DateStr | null,
): DateStr {
  switch (key) {
    case "30g":
      return addDays(today, -29);
    case "90g":
      return addDays(today, -89);
    case "yil":
      return fromParts(toParts(today).year, 1, 1);
    case "tum":
      return earliestStart ?? addDays(today, -364);
  }
}

/** Isı haritası daima son 52 haftayı gösterir — aralıktan bağımsız. */
export function heatmapStart(today: DateStr): DateStr {
  return addDays(today, -363);
}
