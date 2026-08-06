/**
 * Seri (streak) hesabı.
 *
 * Uygulamanın en subtil mantığı: her rutin tipinin serisi FARKLI bir
 * birimle sayılır ve bu birim arayüzde mutlaka yazılmalıdır.
 *
 * - `daily`    → gün. Ardışık tamamlanan günler.
 * - `weekdays` → gün, ama yalnızca ZORUNLU günler sayılır. Pzt yapıldı,
 *                Salı zorunlu değil, Çrş yapıldı → seri 2, kırılmadı.
 * - `flexible` → HAFTA veya AY. Hedefi tutturulan ardışık dönemler.
 *
 * İki tolerans kuralı:
 *
 * 1. Bugün henüz işaretlenmediyse seri KIRILMAZ — gün bitmedi. Sabah
 *    09:00'da "serin sıfırlandı" demek demoralize edicidir ve yanlıştır.
 *    Dünün boş olması ise kırar.
 * 2. Esnek rutinde içinde bulunulan dönem henüz bitmediği için, hedefe
 *    ulaşılmamış olsa da seriyi kırmaz.
 */

import { addDays, compareDates, eachDay, minDate } from "@/lib/date/date";
import { periodKey, periodRange } from "@/lib/date/period";
import type { DateStr, Period } from "@/lib/date/types";
import { isCompleted } from "@/features/entries/completion";
import type { EntryMap } from "@/features/entries/entry-map";
import { isActiveOn, isDueOn, scheduleAt } from "@/features/routines/schedule";
import type { RoutineWithSchedule } from "@/features/routines/types";

/** Serinin birimi. Arayüzde "12 gün" / "5 hafta" diye yazılır. */
export type StreakUnit = "day" | "week" | "month";

export interface StreakResult {
  /** Devam eden seri. */
  current: number;
  /** Tüm zamanların en uzunu. */
  longest: number;
  unit: StreakUnit;
}

/** Geriye doğru en fazla kaç gün taranır. İki yıl fazlasıyla yeterli. */
const MAX_LOOKBACK_DAYS = 800;

export function computeStreak(
  entries: EntryMap,
  routine: RoutineWithSchedule,
  today: DateStr,
): StreakResult {
  const schedule = scheduleAt(routine, today);

  if (schedule?.kind === "flexible") {
    return periodStreak(entries, routine, today, schedule.per);
  }

  return dayStreak(entries, routine, today);
}

/**
 * Gün bazlı seri — `daily` ve `weekdays` için.
 *
 * Yalnızca ZORUNLU günler sayılır ve zorunlu olmayan günler seriyi
 * kırmaz. `weekdays` rutininde hafta sonları görünmez olur.
 */
function dayStreak(
  entries: EntryMap,
  routine: RoutineWithSchedule,
  today: DateStr,
): StreakResult {
  const start = earliestRelevantDate(routine, today);

  // Zorunlu günleri kronolojik topla, sonra üzerinde yürü.
  const dueDays: DateStr[] = [];
  for (const date of eachDay(start, today)) {
    if (isDueOn(routine, date)) dueDays.push(date);
  }

  let longest = 0;
  let run = 0;
  for (const date of dueDays) {
    if (isCompleted(entries, routine, date)) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Mevcut seri: sondan geriye. Bugün zorunlu ama boşsa atlanır —
  // gün henüz bitmedi, bu bir kırılma değil.
  let current = 0;
  for (let i = dueDays.length - 1; i >= 0; i--) {
    const date = dueDays[i];
    if (isCompleted(entries, routine, date)) {
      current++;
      continue;
    }
    if (date === today) continue; // tolerans
    break;
  }

  return { current, longest, unit: "day" };
}

/**
 * Dönem bazlı seri — esnek rutinler için.
 *
 * Bir dönem, içindeki tamamlanan gün sayısı hedefe ulaştığında
 * tamamlanmış sayılır. İçinde bulunulan dönem henüz bitmediği için
 * hedefe ulaşmamış olsa bile seriyi kırmaz.
 */
function periodStreak(
  entries: EntryMap,
  routine: RoutineWithSchedule,
  today: DateStr,
  per: Period,
): StreakResult {
  const start = earliestRelevantDate(routine, today);

  // Her dönemde kaç gün tamamlandı?
  const doneByPeriod = new Map<string, number>();
  for (const date of eachDay(start, today)) {
    if (!isActiveOn(routine, date)) continue;
    if (!isCompleted(entries, routine, date)) continue;
    const key = periodKey(date, per);
    doneByPeriod.set(key, (doneByPeriod.get(key) ?? 0) + 1);
  }

  const currentKey = periodKey(today, per);

  // Dönemleri kronolojik gez: ilk dönemden bugüne.
  const periods: Array<{ key: string; target: number; done: number }> = [];
  let cursor = periodRange(start, per).start;
  while (compareDates(cursor, today) <= 0) {
    const key = periodKey(cursor, per);
    const target = periodTargetAt(routine, cursor, per);
    if (target !== null) {
      periods.push({ key, target, done: doneByPeriod.get(key) ?? 0 });
    }
    cursor = addDays(periodRange(cursor, per).end, 1);
  }

  let longest = 0;
  let run = 0;
  for (const p of periods) {
    if (p.done >= p.target) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = periods.length - 1; i >= 0; i--) {
    const p = periods[i];
    if (p.done >= p.target) {
      current++;
      continue;
    }
    // İçinde bulunulan dönem bitmedi: kırmaz, ama saymaz da.
    if (p.key === currentKey) continue;
    break;
  }

  return { current, longest, unit: per === "week" ? "week" : "month" };
}

/**
 * O dönemde geçerli olan esnek hedef.
 *
 * Program değişmişse (esnek → günlük) o dönem dönem-bazlı seriye
 * girmez; `null` döner ve atlanır.
 */
function periodTargetAt(
  routine: RoutineWithSchedule,
  date: DateStr,
  per: Period,
): number | null {
  const schedule = scheduleAt(routine, date);
  if (schedule?.kind !== "flexible") return null;
  if (schedule.per !== per) return null;
  return schedule.count;
}

/** Taramanın başlayacağı gün: rutinin başlangıcı ya da tavan sınır. */
function earliestRelevantDate(
  routine: RoutineWithSchedule,
  today: DateStr,
): DateStr {
  const lookbackFloor = addDays(today, -MAX_LOOKBACK_DAYS);
  // İkisinden GEÇ olanı: rutin dünden başladıysa 800 gün taramaya gerek yok.
  return compareDates(routine.startDate, lookbackFloor) > 0
    ? routine.startDate
    : lookbackFloor;
}

/**
 * Bir rutinin son N gündeki tamamlanma geçmişi — seri kartındaki
 * mini görünüm için. En eski gün başta.
 */
export function recentHistory(
  entries: EntryMap,
  routine: RoutineWithSchedule,
  today: DateStr,
  days: number,
): Array<{ date: DateStr; due: boolean; done: boolean }> {
  const from = minDate(addDays(today, -(days - 1)), today);
  return eachDay(from, today).map((date) => ({
    date,
    due: isDueOn(routine, date),
    done: isCompleted(entries, routine, date),
  }));
}
