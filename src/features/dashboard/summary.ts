/**
 * Kontrol panelinin veri modeli — saf mantık.
 *
 * Panel "neyin nerede olduğu" sorusuna tek ekranda cevap verir ve
 * bunu YENİ SORGU AÇMADAN yapar: `useTasks`, `useRoutines`,
 * `useEntries` ve `usePlanGoals` zaten başka ekranlar için çekiliyor
 * ve React Query aynı anahtarı paylaşıyor. Panel için ayrı bir tur
 * açmak, aynı veriyi ikinci kez indirip iki kopyanın sessizce
 * ayrışabileceği bir kapı açardı.
 *
 * Buradaki her fonksiyon `today`'i PARAMETRE alır. `new Date()`
 * çağrısı `lib/date/date.ts` dışında yasak: saat okuyan bir fonksiyon
 * test edilemez ve gece yarısını geçen bir oturumda sessizce başka
 * bir gün hakkında konuşmaya başlar.
 */

import { addDays, eachDay, isoWeekday, startOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { isCompleted } from "@/features/entries/completion";
import type { EntryMap } from "@/features/entries/entry-map";
import { isDueOn } from "@/features/routines/schedule";
import type { RoutineWithSchedule } from "@/features/routines/types";
import { dayScore } from "@/features/stats/score";
import type { Task } from "@/features/tasks/types";

/** Haftanın bir günü — şerit üzerindeki tek sütun. */
export interface WeekDaySlot {
  date: DateStr;
  /** ISO gün numarası, 1=Pzt. */
  weekday: number;
  /** O güne tarihlenmiş iş sayısı. */
  total: number;
  done: number;
  isToday: boolean;
  /**
   * Gelecekte mi?
   *
   * Arayüz için gerekli: boş bir GELECEK gün "yapılmadı" değil "henüz
   * gelmedi"dir ve ikisini aynı çizmek, kullanıcının önündeki haftayı
   * bir başarısızlık listesi gibi göstermek olurdu.
   */
  isFuture: boolean;
}

/**
 * İçinde bulunulan ISO haftasının yedi günü.
 *
 * Pazartesi başlar — uygulamanın her yerinde ISO-8601 kuralı geçerli
 * (bkz. `lib/date/period.ts`) ve haftayı burada Pazar'dan başlatmak,
 * aynı haftanın iki ekranda farklı sınırlarla çizilmesi demek olurdu.
 */
export function weekStrip(
  tasks: readonly Task[],
  today: DateStr,
): WeekDaySlot[] {
  const start = startOfIsoWeek(today);

  /** Tarihten sayaçlara — yedi gün için yedi kez filtrelemekten ucuz. */
  const counts = new Map<DateStr, { total: number; done: number }>();

  for (const task of tasks) {
    if (task.dueDate === null) continue;

    const slot = counts.get(task.dueDate) ?? { total: 0, done: 0 };
    slot.total += 1;
    if (task.done) slot.done += 1;
    counts.set(task.dueDate, slot);
  }

  return eachDay(start, addDays(start, 6)).map((date) => {
    const slot = counts.get(date) ?? { total: 0, done: 0 };

    return {
      date,
      weekday: isoWeekday(date),
      total: slot.total,
      done: slot.done,
      isToday: date === today,
      isFuture: date > today,
    };
  });
}

/** Son N günün rutin doluluğu — ince ısı şeridi. */
export interface HeatSlot {
  date: DateStr;
  /**
   * 0-1 oran, ya da `null`: o gün ÖLÇÜLMÜYOR (hiç zorunlu rutin yok).
   *
   * `null` ≠ `0`. Zorunlu rutini olmayan bir günü "%0" diye çizmek,
   * yapılacak bir şey olmadığı hâlde yapılmamış gibi göstermektir.
   */
  ratio: number | null;
}

export function routineHeat(
  entries: EntryMap,
  routines: readonly RoutineWithSchedule[],
  today: DateStr,
  days: number,
): HeatSlot[] {
  const from = addDays(today, -(days - 1));

  return eachDay(from, today).map((date) => {
    const score = dayScore(entries, routines, date);
    return { date, ratio: score.possible > 0 ? score.ratio : null };
  });
}

/**
 * Bugün işaretlenmeyi bekleyen zorunlu rutin sayısı.
 *
 * Esnek rutinler SAYILMAZ: `isDueOn` onlarda daima `false` döner ve
 * "bugün kaçırdım mı?" sorusu onlar için anlamsızdır — dönem bitmeden
 * kaybedilmiş bir şey yoktur.
 */
export function pendingRoutines(
  entries: EntryMap,
  routines: readonly RoutineWithSchedule[],
  today: DateStr,
): number {
  let count = 0;

  for (const routine of routines) {
    if (!isDueOn(routine, today)) continue;
    if (isCompleted(entries, routine, today)) continue;
    count += 1;
  }

  return count;
}
