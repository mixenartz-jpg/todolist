/**
 * Tamamlanma mantığı ve hücre durumu.
 *
 * Tamamlanma tek bir kuraldan türer: `value >= target`. Veritabanında
 * `done` sütunu yoktur; iki ayrı doğruluk kaynağı kaçınılmaz olarak
 * birbirinden ayrışır.
 */

import { compareDates } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { isActiveOn, isDueOn } from "@/features/routines/schedule";
import type { RoutineWithSchedule } from "@/features/routines/types";
import { entryKey, type EntryMap } from "./entry-map";

/** Bu rutinin bu gündeki kayıtlı değeri. Kayıt yoksa 0. */
export function valueOn(
  entries: EntryMap,
  r: RoutineWithSchedule,
  date: DateStr,
): number {
  return entries.get(entryKey(r.id, date)) ?? 0;
}

/**
 * Hedef tutturuldu mu?
 *
 * Kısmi ilerleme tamamlanmış SAYILMAZ: 8 bardak hedefinde 5 bardak
 * içmek o günü tamamlamaz ve seriyi kırar. Aksi halde hedefin
 * bağlayıcılığı kaybolur.
 */
export function isCompleted(
  entries: EntryMap,
  r: RoutineWithSchedule,
  date: DateStr,
): boolean {
  return valueOn(entries, r, date) >= r.target;
}

/** Hedefe göre ilerleme oranı, 0-1 aralığında kırpılmış. */
export function progressOn(
  entries: EntryMap,
  r: RoutineWithSchedule,
  date: DateStr,
): number {
  if (r.target <= 0) return 0;
  const ratio = valueOn(entries, r, date) / r.target;
  return ratio <= 0 ? 0 : ratio >= 1 ? 1 : ratio;
}

/**
 * Matris hücresinin görsel durumu.
 *
 * `done`      — hedef tutturuldu
 * `partial`   — kayıt var ama hedefin altında
 * `missed`    — zorunluydu, geçti, yapılmadı
 * `empty`     — bugün zorunlu ama henüz kayıt yok
 * `future`    — gelecekte zorunlu; henüz sırası gelmedi
 * `not-due`   — o gün zorunlu değil (esnek rutin veya program dışı gün)
 * `inactive`  — rutin o tarihte henüz başlamamış ya da arşivlenmiş
 *
 * Matris hücresi RENGİNİ yalnızca buradan alır; başka hiçbir predicate
 * çağırmaz. Böylece görsel dil tek yerde tanımlı ve DOM'suz test
 * edilebilir kalır.
 */
export type CellState =
  | "done"
  | "partial"
  | "missed"
  | "empty"
  | "future"
  | "not-due"
  | "inactive";

export function cellState(
  entries: EntryMap,
  r: RoutineWithSchedule,
  date: DateStr,
  today: DateStr,
): CellState {
  if (!isActiveOn(r, date)) return "inactive";

  const value = valueOn(entries, r, date);

  // Kayıt varsa, o günün zorunlu olup olmadığından bağımsız olarak
  // gösterilir: esnek rutinde herhangi bir gün işaretlenebilir.
  if (value > 0) return value >= r.target ? "done" : "partial";

  if (!isDueOn(r, date)) return "not-due";

  // Zorunlu ve kayıt yok. Gün henüz gelmediyse bu bir eksiklik değil —
  // gelecek günleri "yapılacak" gibi işaretlemek ayın yarısını görsel
  // gürültüye çevirir.
  const order = compareDates(date, today);
  if (order < 0) return "missed";
  return order === 0 ? "empty" : "future";
}

/**
 * Bir sonraki değere geçiş — hücreye tıklandığında ne olur?
 *
 * Boolean rutinde (target 1) toggle. Sayısal rutinde her tıklama
 * bir artırır ve hedefe ulaşınca sıfırlanır; böylece tek tıklamayla
 * hem ilerleme kaydedilir hem de yanlışlıkla işaretleneni geri almak
 * mümkün olur.
 */
export function nextValue(current: number, target: number): number {
  if (target <= 1) return current > 0 ? 0 : 1;
  return current >= target ? 0 : current + 1;
}
