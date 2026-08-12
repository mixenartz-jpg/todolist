/**
 * Ay özeti — saf mantık, özelliğin ana test edilebilir çekirdeği.
 *
 * ── Neden `today` bir PARAMETRE? ──
 * "Boş gün" sayısı için. Ağustos'un 12'sindeyken "19 boş gün"
 * göstermek yanlıştır — o günler henüz gelmedi ve kullanıcıya
 * yapmadığı bir şeyi yüzüne vurur. Eşik `min(ayın sonu, bugün)`.
 * Geçmiş bir aya bakılırken ayın tamamı sayılır.
 *
 * Bu, `range.ts`'in "gecikme eşiği ızgaranın başıdır" muhakemesiyle
 * aynı ailedendir: SAYAÇ, KULLANICININ GÖRDÜĞÜ GERÇEĞİ SÖYLEMELİ.
 *
 * `todayStr()` fonksiyonun içinden çağrılMAZ: o `new Date()` kullanır
 * ve src/lib/date/date.ts dışında yasaktır; ayrıca fonksiyon test
 * edilemez hale gelirdi.
 */

import { compareDates, endOfMonth, eachDay, startOfMonth } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";
import type { Category, PlanGoal } from "./types";

/** Bir hedefin ilerleme durumu. */
export interface GoalProgress {
  goal: PlanGoal;
  /** Bu hedefe bağlı görev sayısı (tarihli ya da tarihsiz, hepsi). */
  taskTotal: number;
  taskDone: number;
  /**
   * 0..1 ilerleme.
   *
   * null → HİÇBİR ölçü yok (sayısal hedef verilmemiş ve bağlı görev de
   * yok). `0` göstermek "hiç başlamadın" der; doğrusu "ölçülmüyor" ve
   * arayüz bu ikisini farklı çizmeli.
   */
  ratio: number | null;
  /** İlerlemenin nereden okunduğu — arayüz metnini seçmek için. */
  source: "count" | "tasks" | "none";
}

/** Bir kategorinin ay içindeki payı. */
export interface CategorySlice {
  /** null → kategorisiz görevler kovası. */
  category: Category | null;
  taskTotal: number;
  taskDone: number;
  /** Saati OLAN görevlerin toplam süresi, dakika. */
  minutes: number;
  /** Ay içindeki tüm görevlere oranı, 0..1. */
  share: number;
}

/** Ay içindeki bir günün doluluğu — ısı şeridi için. */
export interface DayLoad {
  date: DateStr;
  total: number;
  done: number;
}

export interface MonthRollup {
  month: DateStr;
  /** Ay aralığına tarihlenmiş görev sayısı. */
  taskTotal: number;
  taskDone: number;
  /** taskDone / taskTotal; hiç görev yoksa null. */
  completionRatio: number | null;
  /** Sayılan günlerden HİÇ görevi olmayanlar. */
  emptyDays: number;
  /** En az bir görevi olan günler. */
  activeDays: number;
  /** Ayın sayılan gün sayısı: `min(ay sonu, bugün)`'e kadar. */
  countedDays: number;
  /** Saati olan görevlerin toplam süresi, dakika. */
  totalMinutes: number;
  goals: GoalProgress[];
  /** Paya göre azalan; kategorisiz kovası HER ZAMAN sonda. */
  categories: CategorySlice[];
}

/** Tek bir hedefin ilerlemesini hesaplar. */
export function goalProgress(
  goal: PlanGoal,
  tasks: readonly Task[],
): GoalProgress {
  let taskTotal = 0;
  let taskDone = 0;

  for (const task of tasks) {
    if (task.goalId !== goal.id) continue;
    taskTotal += 1;
    if (task.done) taskDone += 1;
  }

  /*
   * Sayısal hedef GÖREVLERİ YENER. Kullanıcı bir sayı yazdıysa ölçüyü
   * o seçmiştir; bağlı görevler o hedefin parçası olsa bile ilerlemeyi
   * onlar tanımlamaz ("30 deneme" hedefine üç görev bağlamak, hedefin
   * 3'te 1'i demek değildir).
   */
  if (goal.targetCount !== null) {
    return {
      goal,
      taskTotal,
      taskDone,
      ratio: Math.min(goal.doneCount / goal.targetCount, 1),
      source: "count",
    };
  }

  if (taskTotal > 0) {
    return { goal, taskTotal, taskDone, ratio: taskDone / taskTotal, source: "tasks" };
  }

  // Ne sayı ne görev: ölçülmüyor. `0` DEĞİL — bkz. GoalProgress.ratio.
  return { goal, taskTotal, taskDone, ratio: null, source: "none" };
}

/** Ay içindeki her günün doluluk sayısı. */
export function monthDayLoads(
  tasks: readonly Task[],
  month: DateStr,
): DayLoad[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const byDate = new Map<DateStr, { total: number; done: number }>();

  for (const task of tasks) {
    if (task.dueDate === null) continue;
    if (task.dueDate < start || task.dueDate > end) continue;

    const entry = byDate.get(task.dueDate);
    if (entry) {
      entry.total += 1;
      if (task.done) entry.done += 1;
    } else {
      byDate.set(task.dueDate, { total: 1, done: task.done ? 1 : 0 });
    }
  }

  return eachDay(start, end).map((date) => {
    const entry = byDate.get(date);
    return { date, total: entry?.total ?? 0, done: entry?.done ?? 0 };
  });
}

/**
 * Ayın tam özetini kurar.
 *
 * Tek geçiş: görev sayısı yüzlerle ölçülür ve her sayaç için ayrı
 * dolaşmak (toplam, kategori, gün, hedef) listeyi dört kez gezmek
 * olurdu.
 */
export function buildMonthRollup(
  tasks: readonly Task[],
  goals: readonly PlanGoal[],
  categories: readonly Category[],
  month: DateStr,
  today: DateStr,
): MonthRollup {
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  let taskTotal = 0;
  let taskDone = 0;
  let totalMinutes = 0;

  /** Kategori kimliği → pay; `""` kategorisizler kovası. */
  const slices = new Map<
    string,
    { taskTotal: number; taskDone: number; minutes: number }
  >();
  const activeDates = new Set<DateStr>();

  for (const task of tasks) {
    // Tarihsiz görev AY TOPLAMINA girmez: hiçbir aya ait değildir.
    // Hedefe bağlıysa `goalProgress` onu yine de sayar.
    if (task.dueDate === null) continue;
    if (task.dueDate < start || task.dueDate > end) continue;

    taskTotal += 1;
    if (task.done) taskDone += 1;
    activeDates.add(task.dueDate);

    // Süre yalnızca saati olanlardan (DB kısıtıyla tutarlı).
    const minutes =
      task.startTime !== null && task.durationMinutes !== null
        ? task.durationMinutes
        : 0;
    totalMinutes += minutes;

    const key = task.categoryId ?? "";
    const slice = slices.get(key);
    if (slice) {
      slice.taskTotal += 1;
      if (task.done) slice.taskDone += 1;
      slice.minutes += minutes;
    } else {
      slices.set(key, {
        taskTotal: 1,
        taskDone: task.done ? 1 : 0,
        minutes,
      });
    }
  }

  /*
   * Sayılan gün aralığı: ayın 1'inden `min(ay sonu, bugün)`'e kadar.
   * Gelecek bir aya bakılıyorsa hiçbir gün sayılmaz — "31 boş gün"
   * demek, henüz planlanmamış bir ayı başarısızlık gibi göstermekti.
   */
  const countedEnd = compareDates(today, end) < 0 ? today : end;
  const countedDays =
    compareDates(countedEnd, start) < 0 ? 0 : eachDay(start, countedEnd).length;

  let activeDays = 0;
  for (const date of activeDates) {
    if (compareDates(date, countedEnd) <= 0) activeDays += 1;
  }

  return {
    month: start,
    taskTotal,
    taskDone,
    completionRatio: taskTotal === 0 ? null : taskDone / taskTotal,
    emptyDays: Math.max(countedDays - activeDays, 0),
    activeDays,
    countedDays,
    totalMinutes,
    goals: goals.map((goal) => goalProgress(goal, tasks)),
    categories: buildSlices(slices, categoryById, taskTotal),
  };
}

function buildSlices(
  slices: ReadonlyMap<
    string,
    { taskTotal: number; taskDone: number; minutes: number }
  >,
  categoryById: ReadonlyMap<string, Category>,
  taskTotal: number,
): CategorySlice[] {
  const out: CategorySlice[] = [];
  let uncategorized: CategorySlice | null = null;

  for (const [key, value] of slices) {
    const slice: CategorySlice = {
      // Silinmiş bir kategoriye ait görev kalmışsa (FK set null yarışı)
      // kategorisizler kovasına düşer — ekranda "bilinmeyen" diye bir
      // üçüncü durum yaratmak yerine.
      category: key === "" ? null : (categoryById.get(key) ?? null),
      taskTotal: value.taskTotal,
      taskDone: value.taskDone,
      minutes: value.minutes,
      share: taskTotal === 0 ? 0 : value.taskTotal / taskTotal,
    };

    if (slice.category === null) {
      // İki kova birleşebilir (kategorisiz + silinmiş kategori).
      uncategorized =
        uncategorized === null
          ? slice
          : {
              category: null,
              taskTotal: uncategorized.taskTotal + slice.taskTotal,
              taskDone: uncategorized.taskDone + slice.taskDone,
              minutes: uncategorized.minutes + slice.minutes,
              share: uncategorized.share + slice.share,
            };
    } else {
      out.push(slice);
    }
  }

  // Paya göre azalan; eşitlikte ada göre (kararlı ve okunabilir sıra).
  out.sort((a, b) => {
    if (b.taskTotal !== a.taskTotal) return b.taskTotal - a.taskTotal;
    return (a.category?.name ?? "").localeCompare(b.category?.name ?? "", "tr");
  });

  // Kategorisizler HER ZAMAN sonda: bir kategori değil, "geri kalan".
  if (uncategorized !== null) out.push(uncategorized);

  return out;
}
