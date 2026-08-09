import { addDays, eachDay } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { Task } from "./types";

/** Haftalık ızgaranın tek bir gün sütunu. */
export interface WeekDay {
  date: DateStr;
  /** YALNIZCA o güne tarihlenenler. Geçmişten taşma yok — bkz. modül başı. */
  tasks: Task[];
  openCount: number;
  doneCount: number;
}

export interface WeekPlan {
  /** Her zaman 7 eleman, Pazartesi → Pazar. */
  days: WeekDay[];
  /** Haftanın BAŞINDAN önceye tarihli, tamamlanmamış görevler. */
  overdue: Task[];
  openTotal: number;
  doneTotal: number;
}

/** Bir haftada kaç gün var — ızgaranın sütun sayısı. */
const WEEK_LENGTH = 7;

/**
 * Haftalık planı kurar.
 *
 * ── Neden `tasksForDay` KULLANILMIYOR? ──
 * `tasksForDay` (queries.ts) o günün görevlerine ek olarak GEÇMİŞTEKİ
 * tamamlanmamışları da döndürür. Bugün ekranında bu doğrudur: dünkü
 * yapılmamış bir görev sessizce kaybolmamalı. Yedi sütunlu bir
 * ızgarada ise aynı kural felakettir — Pazartesi'ye tarihli yapılmamış
 * bir görev Pzt'den Paz'a yedi sütunda birden görünür ve her sütunun
 * sayacı bir öncekinden büyük olmak zorunda kalır.
 *
 * Bu yüzden ızgarada başka bir anlam benimsenir: her sütun yalnızca o
 * güne tarihlenenleri gösterir, gecikmiş olanlar AYRI BİR KOVADA
 * toplanır. Gecikmiş bir görev bu haftanın hiçbir gününe ait değildir;
 * "şimdi"ye aittir ve arayüzde ızgaranın üstünde durur.
 *
 * `tasksForDay` bilerek DEĞİŞTİRİLMEDİ: Bugün ekranı ve takvim gün
 * paneli mevcut davranışlarını korur.
 *
 * ── Neden `today` PARAMETRE DEĞİL? ──
 * Gecikme eşiği haftanın BAŞIDIR, bugün değil. `< today` yazılsaydı,
 * görüntülenen haftanın Pazartesi'sine tarihli yapılmamış bir görev
 * (bugün Çarşamba ise) hem kendi sütununda hem gecikme kovasında iki
 * kez görünürdü. Hafta içinde kalan bir görev zaten sütununda duruyor.
 * Bugünün tek rolü şeridin GÖRÜNÜRLÜĞÜNÜ belirlemektir ve o da ayrı
 * bir fonksiyondur (`weekContainsToday`) — kovalama bugünü bilmez.
 */
export function buildWeekPlan(
  tasks: readonly Task[],
  weekStart: DateStr,
): WeekPlan {
  const weekEnd = addDays(weekStart, WEEK_LENGTH - 1);

  // Tek geçişte kovalama: görev sayısı yüzlerle ölçülür, gün başına
  // ayrı filtre yedi kez dolaşmak olurdu.
  const byDate = new Map<DateStr, Task[]>();
  const overdue: Task[] = [];

  for (const task of tasks) {
    // Tarihsiz görevler ("bir ara") ne sütuna ne kovaya girer: hafta
    // planı tarihlenmiş işin resmidir. Onların yeri Bugün ekranıdır.
    if (task.dueDate === null) continue;

    if (task.dueDate < weekStart) {
      if (!task.done) overdue.push(task);
      continue;
    }

    if (task.dueDate > weekEnd) continue;

    const bucket = byDate.get(task.dueDate);
    if (bucket) bucket.push(task);
    else byDate.set(task.dueDate, [task]);
  }

  let openTotal = 0;
  let doneTotal = 0;

  const days = eachDay(weekStart, weekEnd).map((date): WeekDay => {
    const dayTasks = byDate.get(date) ?? [];
    const doneCount = dayTasks.filter((t) => t.done).length;
    const openCount = dayTasks.length - doneCount;

    openTotal += openCount;
    doneTotal += doneCount;

    return { date, tasks: dayTasks, openCount, doneCount };
  });

  return { days, overdue, openTotal, doneTotal };
}

/**
 * Görüntülenen hafta bugünü içeriyor mu?
 *
 * Gecikme şeridi yalnızca bu doğruyken gösterilir. Gelecek bir haftaya
 * bakarken "gecikenler" o haftanın meselesi değildir; geçmiş bir
 * haftada ise zaten her yapılmamış görev geciktiği için şerit tüm
 * ekranı doldurur ve hiçbir şey söylemez.
 */
export function weekContainsToday(weekStart: DateStr, today: DateStr): boolean {
  return today >= weekStart && today <= addDays(weekStart, WEEK_LENGTH - 1);
}
