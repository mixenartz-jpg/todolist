/**
 * Dönem (hafta/ay) anahtarları ve aralıkları.
 *
 * Esnek rutinler ("haftada 3 kez") dönem bazlı değerlendirilir: bir
 * dönem, içindeki tamamlanmış gün sayısı hedefe ulaştığında tamamlanmış
 * sayılır. Seri de gün değil, dönem birimiyle sayılır.
 *
 * ISO-8601 hafta kuralı: hafta Pazartesi başlar, yılın 1. haftası o
 * yılın ilk Perşembe'sini içeren haftadır. Bu yüzden 29-31 Aralık bir
 * SONRAKİ yılın 1. haftasına, 1-3 Ocak da bir ÖNCEKİ yılın son
 * haftasına düşebilir.
 */

import {
  addDays,
  endOfIsoWeek,
  endOfMonth,
  fromParts,
  isoWeekday,
  startOfIsoWeek,
  startOfMonth,
  toParts,
} from "./date";
import type { DateStr, Period } from "./types";

/** ISO hafta numarası ve ait olduğu ISO yıl. */
export function isoWeekParts(d: DateStr): { year: number; week: number } {
  // Haftanın Perşembe'si, haftanın hangi ISO yıla ait olduğunu belirler.
  const thursday = addDays(d, 4 - isoWeekday(d));
  const { year } = toParts(thursday);

  const jan4 = fromParts(year, 1, 4); // 4 Ocak daima 1. haftadadır
  const firstMonday = startOfIsoWeek(jan4);
  const weekStart = startOfIsoWeek(thursday);

  // Aynı yıl içinde kaldığımız için basit gün farkı yeterli.
  const days = daysBetween(firstMonday, weekStart);
  return { year, week: Math.round(days / 7) + 1 };
}

function daysBetween(from: DateStr, to: DateStr): number {
  // date.ts'teki diffDays ile aynı iş; döngüsel import olmaması için
  // burada yeniden hesaplamak yerine küçük bir yardımcı kullanıyoruz.
  const a = toParts(from);
  const b = toParts(to);
  const ta = Date.UTC(a.year, a.month - 1, a.day);
  const tb = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((tb - ta) / 86_400_000);
}

/** '2026-W32' — ISO hafta anahtarı. */
export function weekKey(d: DateStr): string {
  const { year, week } = isoWeekParts(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** '2026-08' — ay anahtarı. */
export function monthKey(d: DateStr): string {
  const { year, month } = toParts(d);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Döneme göre anahtar üretir. Aynı dönemdeki tüm günler aynı anahtarı alır. */
export function periodKey(d: DateStr, per: Period): string {
  return per === "week" ? weekKey(d) : monthKey(d);
}

/** Bir tarihin ait olduğu dönemin başlangıç ve bitiş günleri. */
export function periodRange(
  d: DateStr,
  per: Period,
): { start: DateStr; end: DateStr } {
  return per === "week"
    ? { start: startOfIsoWeek(d), end: endOfIsoWeek(d) }
    : { start: startOfMonth(d), end: endOfMonth(d) };
}

/** Bir önceki döneme ait herhangi bir gün. Dönem geriye yürümek için. */
export function previousPeriod(d: DateStr, per: Period): DateStr {
  const { start } = periodRange(d, per);
  return addDays(start, -1);
}

/** Dönemdeki toplam gün sayısı. Günlük skor ağırlıklandırmasında kullanılır. */
export function periodLength(d: DateStr, per: Period): number {
  const { start, end } = periodRange(d, per);
  return daysBetween(start, end) + 1;
}
