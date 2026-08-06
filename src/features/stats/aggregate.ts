/**
 * İstatistik toplamaları — haftalık trend, rutin dökümü, genel özet.
 *
 * Hepsi saf: girdi haritası + rutinler + tarih aralığı → sayılar.
 * Bir yılın verisi birkaç bin satırdır; bu hesaplar milisaniyeler
 * sürer ve sunucuya gitmeye değmez.
 */

import {
  addDays,
  compareDates,
  eachDay,
  endOfIsoWeek,
  isoWeekday,
  startOfIsoWeek,
} from "@/lib/date/date";
import { weekKey } from "@/lib/date/period";
import type { DateStr } from "@/lib/date/types";
import { isCompleted } from "@/features/entries/completion";
import type { EntryMap } from "@/features/entries/entry-map";
import { isActiveOn } from "@/features/routines/schedule";
import type { RoutineWithSchedule } from "@/features/routines/types";
import { completionRate, dayScore, totalValue } from "./score";
import { computeStreak, type StreakResult } from "./streak";

/** Bir haftanın özeti — trend grafiğinin veri noktası. */
export interface WeekPoint {
  /** '2026-W32' */
  key: string;
  start: DateStr;
  end: DateStr;
  /** Kazanılan / mümkün, 0-1. */
  ratio: number;
  earned: number;
  possible: number;
}

/**
 * Haftalık tamamlanma oranı serisi.
 *
 * Günlük değil haftalık: 365 günlük bir çizgi grafik okunmaz gürültüdür;
 * haftalık toplama trendi görünür kılar.
 */
export function weeklyTrend(
  entries: EntryMap,
  routines: readonly RoutineWithSchedule[],
  from: DateStr,
  to: DateStr,
): WeekPoint[] {
  const buckets = new Map<string, { earned: number; possible: number }>();

  for (const date of eachDay(from, to)) {
    const score = dayScore(entries, routines, date);
    if (score.possible <= 0) continue;

    const key = weekKey(date);
    const bucket = buckets.get(key) ?? { earned: 0, possible: 0 };
    bucket.earned += score.earned;
    bucket.possible += score.possible;
    buckets.set(key, bucket);
  }

  // Hafta başlangıçlarını kronolojik yürüyerek üret — Map sırası
  // ekleme sırasına bağlı, ona güvenmiyoruz.
  const points: WeekPoint[] = [];
  let cursor = startOfIsoWeek(from);

  while (compareDates(cursor, to) <= 0) {
    const key = weekKey(cursor);
    const bucket = buckets.get(key);

    if (bucket && bucket.possible > 0) {
      points.push({
        key,
        start: cursor,
        end: endOfIsoWeek(cursor),
        earned: round2(bucket.earned),
        possible: round2(bucket.possible),
        ratio: bucket.earned / bucket.possible,
      });
    }

    cursor = addDays(cursor, 7);
  }

  return points;
}

/** Bir rutinin aralıktaki performansı — döküm tablosunun satırı. */
export interface RoutineSummary {
  routine: RoutineWithSchedule;
  /** Tamamlanan / beklenen. */
  done: number;
  expected: number;
  rate: number;
  streak: StreakResult;
  /** Sayısal rutinlerde toplam (ör. toplam sayfa). Değilse null. */
  total: number | null;
}

export function routineSummaries(
  entries: EntryMap,
  routines: readonly RoutineWithSchedule[],
  from: DateStr,
  to: DateStr,
  today: DateStr,
): RoutineSummary[] {
  return routines.map((routine) => {
    const { done, expected, rate } = completionRate(entries, routine, from, to);
    return {
      routine,
      done,
      expected,
      rate,
      streak: computeStreak(entries, routine, today),
      total: routine.target > 1 ? totalValue(entries, routine, from, to) : null,
    };
  });
}

/** Ekranın tepesindeki özet sayılar. */
export interface OverallStats {
  /** Aralıktaki genel tamamlanma oranı. */
  rate: number;
  /** Tamamen tamamlanmış (%100) gün sayısı. */
  perfectDays: number;
  /** İş olan gün sayısı (payda). */
  activeDays: number;
  /** Hiç kaçırılmayan en uzun gün serisi (tüm rutinler birlikte). */
  bestDayStreak: number;
  /** En yüksek mevcut seri ve sahibi. */
  topStreak: { routine: RoutineWithSchedule; streak: StreakResult } | null;
}

export function overallStats(
  entries: EntryMap,
  routines: readonly RoutineWithSchedule[],
  from: DateStr,
  to: DateStr,
  today: DateStr,
): OverallStats {
  let earned = 0;
  let possible = 0;
  let perfectDays = 0;
  let activeDays = 0;

  let bestDayStreak = 0;
  let run = 0;

  for (const date of eachDay(from, to)) {
    const score = dayScore(entries, routines, date);
    if (score.possible <= 0) continue;

    activeDays++;
    earned += score.earned;
    possible += score.possible;

    // Gelecek günler "kusursuz" sayılmaz — henüz yaşanmadılar.
    const isPast = compareDates(date, today) <= 0;
    const perfect = isPast && score.ratio >= 1;

    if (perfect) {
      perfectDays++;
      run++;
      if (run > bestDayStreak) bestDayStreak = run;
    } else if (isPast) {
      run = 0;
    }
  }

  const summaries = routineSummaries(entries, routines, from, to, today);
  const topStreak = summaries.reduce<OverallStats["topStreak"]>((best, s) => {
    if (best === null || s.streak.current > best.streak.current) {
      return { routine: s.routine, streak: s.streak };
    }
    return best;
  }, null);

  return {
    rate: possible > 0 ? earned / possible : 0,
    perfectDays,
    activeDays,
    bestDayStreak,
    topStreak: topStreak && topStreak.streak.current > 0 ? topStreak : null,
  };
}

/**
 * Isı haritası verisi: her gün için oran.
 *
 * Gelecek günler dışarıda bırakılır; %0 olarak göstermek "kaçırılmış"
 * izlenimi verir.
 */
export function heatmapData(
  entries: EntryMap,
  routines: readonly RoutineWithSchedule[],
  from: DateStr,
  to: DateStr,
  today: DateStr,
): Map<DateStr, number | null> {
  const out = new Map<DateStr, number | null>();

  for (const date of eachDay(from, to)) {
    if (compareDates(date, today) > 0) {
      out.set(date, null);
      continue;
    }
    const score = dayScore(entries, routines, date);
    out.set(date, score.possible > 0 ? score.ratio : null);
  }

  return out;
}

/** Haftanın hangi günü daha iyi geçiyor? (ISO: Pzt=1 … Paz=7) */
export function weekdayBreakdown(
  entries: EntryMap,
  routines: readonly RoutineWithSchedule[],
  from: DateStr,
  to: DateStr,
): Array<{ weekday: number; ratio: number; days: number }> {
  const buckets = new Map<number, { earned: number; possible: number; days: number }>();

  for (const date of eachDay(from, to)) {
    const score = dayScore(entries, routines, date);
    if (score.possible <= 0) continue;

    const weekday = isoWeekday(date);
    const bucket = buckets.get(weekday) ?? { earned: 0, possible: 0, days: 0 };
    bucket.earned += score.earned;
    bucket.possible += score.possible;
    bucket.days++;
    buckets.set(weekday, bucket);
  }

  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
    const bucket = buckets.get(weekday);
    return {
      weekday,
      ratio: bucket && bucket.possible > 0 ? bucket.earned / bucket.possible : 0,
      days: bucket?.days ?? 0,
    };
  });
}

/** Aktif (arşivlenmemiş ve aralıkta yaşayan) rutinleri süzer. */
export function relevantRoutines(
  routines: readonly RoutineWithSchedule[],
  from: DateStr,
  to: DateStr,
): RoutineWithSchedule[] {
  return routines.filter((r) =>
    eachDay(from, to).some((date) => isActiveOn(r, date)),
  );
}

/** Bir rutinin aralıkta hiç tamamlandığı gün var mı? */
export function hasAnyCompletion(
  entries: EntryMap,
  routine: RoutineWithSchedule,
  from: DateStr,
  to: DateStr,
): boolean {
  return eachDay(from, to).some((date) => isCompleted(entries, routine, date));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
