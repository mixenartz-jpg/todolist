/**
 * Geçen haftanın geri bakışı — saf mantık.
 *
 * ── Neden GEÇEN hafta, bu hafta değil? ──
 * Bitmemiş bir haftayı değerlendirmek yanıltıcı: Salı günü "bu hafta
 * %28" demek, haftanın beşte üçü daha önündeyken bir başarısızlık
 * bildirimi gibi okunur. Geri bakış kapanmış bir defteri okur.
 *
 * ── Yeni sorgu yok ──
 * `StatsScreen` zaten geniş bir aralık çekiyor ve bu hesap onun
 * `EntryMap`'ini yeniden kullanıyor. Geçen hafta için ayrı bir tur
 * açmak, aynı satırları ikinci kez indirmek olurdu.
 */

import { addDays, endOfIsoWeek, startOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { EntryMap } from "@/features/entries/entry-map";
import type { RoutineWithSchedule } from "@/features/routines/types";
import type { Task } from "@/features/tasks/types";
import { dayScore } from "./score";

export interface WeekLookback {
  start: DateStr;
  end: DateStr;
  /**
   * Rutin doluluk oranı, 0-1. `null` → o hafta hiç zorunlu rutin
   * yoktu ve oran ölçülemez. `0` DEĞİL: ölçülmeyen bir haftayı "%0"
   * diye göstermek, yapılacak bir şey olmadığı hâlde yapılmamış gibi
   * göstermektir.
   */
  routineRatio: number | null;
  /** O haftaya tarihlenmiş görevler. */
  taskTotal: number;
  taskDone: number;
  /** Hafta içindeki kusursuz (%100) gün sayısı. */
  perfectDays: number;
}

/** Geçen ISO haftasının sınırları. */
export function lastWeekRange(today: DateStr): { start: DateStr; end: DateStr } {
  // Bu haftanın pazartesinden bir gün geri = geçen haftanın pazarı.
  const lastSunday = addDays(startOfIsoWeek(today), -1);

  return {
    start: startOfIsoWeek(lastSunday),
    end: endOfIsoWeek(lastSunday),
  };
}

/**
 * Geçen haftanın özeti.
 *
 * Rutin ve görev AYRI ölçülüyor, tek bir orana karıştırılmıyor: bir
 * hafta rutinlerinde mükemmel ama görevlerinde zayıf olabilir ve
 * ikisini toplamak o bilgiyi yok ederdi. `dayScore` da aynı ayrımı
 * yapıyor (görevleri hiç saymıyor) — bu hesap onu izliyor.
 */
export function buildWeekLookback(
  entries: EntryMap,
  routines: readonly RoutineWithSchedule[],
  tasks: readonly Task[],
  today: DateStr,
): WeekLookback {
  const { start, end } = lastWeekRange(today);

  let earned = 0;
  let possible = 0;
  let perfectDays = 0;

  for (let date = start; date <= end; date = addDays(date, 1)) {
    const score = dayScore(entries, routines, date);
    if (score.possible <= 0) continue;

    earned += score.earned;
    possible += score.possible;
    if (score.ratio >= 1) perfectDays += 1;
  }

  let taskTotal = 0;
  let taskDone = 0;

  for (const task of tasks) {
    if (task.dueDate === null) continue;
    if (task.dueDate < start || task.dueDate > end) continue;

    taskTotal += 1;
    if (task.done) taskDone += 1;
  }

  return {
    start,
    end,
    routineRatio: possible > 0 ? earned / possible : null,
    taskTotal,
    taskDone,
    perfectDays,
  };
}
