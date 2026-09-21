/**
 * Takvim ızgarası düzeni — saf mantık.
 *
 * Ay her zaman Pazartesi başlayan tam haftalar halinde gösterilir;
 * ayın ilk gününden önceki ve son gününden sonraki hücreler komşu
 * aylardan doldurulur. Boş bırakmak yerine komşu ayı soluk göstermek,
 * hafta yapısını korur ve "gelecek Pazartesi" gibi sınır günlerini
 * görünür kılar.
 */

import { addDays, daysInMonth, fromParts, isoWeekday } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";

export interface CalendarCell {
  date: DateStr;
  /** Görüntülenen aya mı ait, komşu aydan mı taşındı? */
  inMonth: boolean;
}

/**
 * Bir ayın takvim hücreleri: tam haftalar, Pazartesi başlangıçlı.
 *
 * Uzunluk daima 7'nin katıdır (35 veya 42).
 */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = fromParts(year, month, 1);
  const last = fromParts(year, month, daysInMonth(year, month));

  // Pazartesi'ye kadar geri git (ISO: Pzt=1).
  const start = addDays(first, -(isoWeekday(first) - 1));
  // Pazar'a kadar ileri git (ISO: Paz=7).
  const end = addDays(last, 7 - isoWeekday(last));

  const cells: CalendarCell[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    cells.push({ date, inMonth: date >= first && date <= last });
  }

  return cells;
}

/** Izgarayı haftalık satırlara böler. */
export function toWeeks(cells: readonly CalendarCell[]): CalendarCell[][] {
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
