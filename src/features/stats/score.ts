/**
 * Günlük skor ve yoğunluk seviyesi.
 *
 * Matrisin alt satırı, takvimin gün tonlaması ve yıllık ısı haritası
 * buradan beslenir.
 */

import { eachDay } from "@/lib/date/date";
import { periodLength, periodRange } from "@/lib/date/period";
import type { DateStr } from "@/lib/date/types";
import { isCompleted, progressOn, valueOn } from "@/features/entries/completion";
import type { EntryMap } from "@/features/entries/entry-map";
import { isActiveOn, isDueOn, scheduleAt } from "@/features/routines/schedule";
import type { RoutineWithSchedule } from "@/features/routines/types";

export interface DayScore {
  /** Kazanılan puan (kısmi ilerleme kesirli katkı yapar). */
  earned: number;
  /** O gün elde edilebilecek toplam puan. */
  possible: number;
  /** earned / possible, 0-1. possible sıfırsa 0. */
  ratio: number;
}

/**
 * Esnek rutinin belirli bir dönemdeki ilerlemesi.
 *
 * Esnek rutinlerde yükümlülük gün değil dönem düzeyindedir: "bu hafta
 * 3 kez" hedefine karşı kaç gün tamamlandığı ölçülür.
 */
export interface PeriodProgress {
  done: number;
  target: number;
  per: "week" | "month";
  start: DateStr;
  end: DateStr;
  /** Dönem hedefi tutturuldu mu? */
  complete: boolean;
}

/**
 * Esnek rutinin bu tarihi içeren dönemdeki ilerlemesi.
 * Rutin o tarihte esnek değilse `null`.
 */
export function periodProgress(
  entries: EntryMap,
  r: RoutineWithSchedule,
  date: DateStr,
): PeriodProgress | null {
  const schedule = scheduleAt(r, date);
  if (schedule?.kind !== "flexible") return null;

  const { start, end } = periodRange(date, schedule.per);

  let done = 0;
  for (const day of eachDay(start, end)) {
    if (isActiveOn(r, day) && isCompleted(entries, r, day)) done++;
  }

  return {
    done,
    target: schedule.count,
    per: schedule.per,
    start,
    end,
    complete: done >= schedule.count,
  };
}

/**
 * Bir rutinin belirli bir güne katkısı: { earned, possible }.
 *
 * Gün düzeyi rutinler (daily / weekdays): o gün zorunluysa 1 puanlık
 * yer kaplar, kısmi ilerleme kesirli puan getirir.
 *
 * Esnek rutinler: dönem yükümlülüğü döneme eşit dağıtılır. Haftada 3
 * kez koşu, o haftanın her günü 1/7 puanlık yer kaplar ve dönemdeki
 * ilerleme oranı kadar puan getirir. Böylece esnek bir rutin, dönem
 * boyunca günlük bir rutinle aynı ağırlığa sahip olur ve alt satırdaki
 * skor, işaretlenen güne sıçramak yerine yumuşak ilerler.
 *
 * Bu paylaştırma tutarlı ama keyfî bir seçimdir; esnek rutinin doğası
 * gereği "bu gün ne kadar hak edildi" sorusunun tek doğru cevabı yoktur.
 */
function contribution(
  entries: EntryMap,
  r: RoutineWithSchedule,
  date: DateStr,
): { earned: number; possible: number } {
  if (!isActiveOn(r, date)) return { earned: 0, possible: 0 };

  const schedule = scheduleAt(r, date);
  if (schedule === null) return { earned: 0, possible: 0 };

  if (schedule.kind === "flexible") {
    const progress = periodProgress(entries, r, date);
    if (progress === null) return { earned: 0, possible: 0 };

    const share = 1 / periodLength(date, schedule.per);
    const ratio = Math.min(progress.done / progress.target, 1);
    return { earned: ratio * share, possible: share };
  }

  if (!isDueOn(r, date)) {
    // Zorunlu olmayan günde yapılan iş bonus sayılır: skoru yukarı
    // çekmez ama payda da büyümez. Aksi halde fazladan çalışmak
    // günlük oranı düşürürdü.
    return { earned: 0, possible: 0 };
  }

  return { earned: progressOn(entries, r, date), possible: 1 };
}

/** Bir günün toplam skoru — matrisin alt satırı. */
export function dayScore(
  entries: EntryMap,
  routines: readonly RoutineWithSchedule[],
  date: DateStr,
): DayScore {
  let earned = 0;
  let possible = 0;

  for (const r of routines) {
    const c = contribution(entries, r, date);
    earned += c.earned;
    possible += c.possible;
  }

  // Kayan nokta birikimini törpüle: %99.99999999 gibi değerler çıkmasın.
  earned = round2(earned);
  possible = round2(possible);

  return {
    earned,
    possible,
    ratio: possible > 0 ? earned / possible : 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Skor oranını 4 adımlı yoğunluk rampasının seviyesine eşler.
 *
 * 0 = hiç yapılmadı (veya yapılacak bir şey yoktu), 4 = tamamı.
 * Rampa `dataviz` ordinal doğrulamasından geçmiştir: tek hue, monoton
 * açıklık, komşu adımlar arası görünür fark.
 */
export function densityLevel(ratio: number): 0 | 1 | 2 | 3 | 4 {
  if (ratio <= 0) return 0;
  // Eşikler gerçek dağılıma göre: günlük oranlar pratikte %40–%100
  // aralığında yoğunlaşır. Eşitlikçi bir bölme (0.25/0.5/0.75) neredeyse
  // her günü aynı iki seviyeye düşürür ve ısı haritası tekdüze görünür.
  if (ratio < 0.5) return 1;
  if (ratio < 0.75) return 2;
  if (ratio < 1) return 3;
  return 4;
}

/** Bir aralıktaki her günün skoru — takvim ve ısı haritası için. */
export function scoreRange(
  entries: EntryMap,
  routines: readonly RoutineWithSchedule[],
  from: DateStr,
  to: DateStr,
): Map<DateStr, DayScore> {
  const out = new Map<DateStr, DayScore>();
  for (const date of eachDay(from, to)) {
    out.set(date, dayScore(entries, routines, date));
  }
  return out;
}

/**
 * Bir rutinin belirli aralıktaki tamamlanma yüzdesi.
 *
 * Payda, rutinin tipine göre belirlenir: gün düzeyi rutinlerde zorunlu
 * gün sayısı, esnek rutinlerde dönem hedeflerinin toplamı.
 */
export function completionRate(
  entries: EntryMap,
  r: RoutineWithSchedule,
  from: DateStr,
  to: DateStr,
): { done: number; expected: number; rate: number } {
  let done = 0;
  let expected = 0;

  const seenPeriods = new Set<string>();

  for (const date of eachDay(from, to)) {
    if (!isActiveOn(r, date)) continue;

    const schedule = scheduleAt(r, date);
    if (schedule === null) continue;

    if (schedule.kind === "flexible") {
      // Her dönem bir kez sayılır.
      const progress = periodProgress(entries, r, date);
      if (progress === null) continue;
      const key = `${progress.start}`;
      if (seenPeriods.has(key)) continue;
      seenPeriods.add(key);

      done += Math.min(progress.done, progress.target);
      expected += progress.target;
      continue;
    }

    if (!isDueOn(r, date)) continue;
    expected += 1;
    if (isCompleted(entries, r, date)) done += 1;
  }

  return { done, expected, rate: expected > 0 ? done / expected : 0 };
}

/** Bir rutinin aralıktaki toplam sayısal değeri (ör. toplam sayfa). */
export function totalValue(
  entries: EntryMap,
  r: RoutineWithSchedule,
  from: DateStr,
  to: DateStr,
): number {
  let total = 0;
  for (const date of eachDay(from, to)) total += valueOn(entries, r, date);
  return round2(total);
}
