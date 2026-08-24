/**
 * Günün kapanış özeti — "bugün ne oldu".
 *
 * Gün rayının en altındaki blok buradan beslenir. Sunucuya YENİ SORGU
 * AÇMAZ: her girdi Bugün ekranının zaten çektiği önbellekten gelir
 * (rutinler, girdiler, görevler, yanlışlar). Saf fonksiyon olması,
 * bileşene gömülü olsaydı bu depoda hiçbir testin ona ulaşamayacak
 * olmasındandır — yalnızca `.test.ts` çalışıyor, React test kütüphanesi
 * kurulu değil (aynı gerekçe `sections.ts`'in altında yazılı).
 *
 * ── `reviews.done` neden YOK? ──
 * "Bugün kaç tekrar yaptım" sorusu bu şemayla dürüstçe cevaplanamaz.
 * `mistakes` tablosunda tekrarın NE ZAMAN yapıldığını tutan bir sütun
 * yok; `updated_at` var ama not düzenlemede ve toplu yeniden
 * adlandırmada da oynuyor, dolayısıyla "tekrar edildi" anlamına
 * gelmiyor. Yaklaşık bir sayı üretip kesinmiş gibi göstermek, hiç
 * göstermemekten kötüdür. Yalnızca BEKLEYEN sayılır.
 *
 * ── `minutes` ne ölçüyor? ──
 * Tamamlanmış ve SAATİ OLAN görevlerin planlanan süresi. "Gerçekten
 * harcanan zaman" DEĞİL — onu ölçmek `completed_at` ister ve o sütun
 * yok. Arayüzde de "planlanan" diye adlandırılmalı.
 */

import type { DateStr } from "@/lib/date/types";
import { isCompleted } from "@/features/entries/completion";
import type { EntryMap } from "@/features/entries/entry-map";
import { isActiveOn, isDueOn } from "@/features/routines/schedule";
import type { RoutineWithSchedule } from "@/features/routines/types";
import { dueMistakes } from "@/features/mistakes/review";
import type { Mistake } from "@/features/mistakes/types";
import { tasksForDay } from "@/features/tasks/queries";
import type { Task } from "@/features/tasks/types";

export interface DayClose {
  /** Bugün zorunlu olan rutinler ve kaçının tamamlandığı. */
  routines: { done: number; total: number };
  /** Bugünün ekranında duran görevler — taşananlar DAHİL. */
  tasks: { done: number; total: number };
  /** Tamamlanmış saatli görevlerin PLANLANAN toplam süresi, dakika. */
  minutes: number;
  /** Vadesi gelmiş tekrar sayısı. `done` için bkz. dosya başı. */
  reviews: { due: number };
}

/*
 * `score` alanı BİLEREK YOK.
 *
 * Günün oranını başlıktaki ilerleme çubuğu zaten `dayScore` ile
 * hesaplıyor (TodayScreen). Burada ikinci bir kopya tutmak, aynı
 * sayının iki bağımsız kaynağı demekti: biri değişip öteki
 * unutulduğunda özet ile başlık sessizce çelişirdi. Özetin gösterdiği
 * "3/5 rutin" zaten aynı bilginin ham hâli.
 */

export interface DayCloseInput {
  entries: EntryMap;
  routines: readonly RoutineWithSchedule[];
  tasks: readonly Task[];
  mistakes: readonly Mistake[];
  today: DateStr;
}

export function buildDayClose({
  entries,
  routines,
  tasks,
  mistakes,
  today,
}: DayCloseInput): DayClose {
  /*
   * Payda `isDueOn`: bugün ZORUNLU olanlar. Bugün gelmeyen bir rutini
   * yapmak bonustur ve paydayı büyütmemeli — `score.ts`'teki
   * `contribution` da aynı kuralı uyguluyor ve ikisinin ayrışması
   * özetin başlıktaki oranla çelişmesi demekti.
   */
  let routinesDone = 0;
  let routinesTotal = 0;

  for (const r of routines) {
    if (!isActiveOn(r, today)) continue;
    if (!isDueOn(r, today)) continue;
    routinesTotal += 1;
    if (isCompleted(entries, r, today)) routinesDone += 1;
  }

  /*
   * `tasksForDay` yeniden kullanılır: ekranda görünen görev kümesiyle
   * özetin saydığı küme AYNI olmalı. Kendi filtresini yazmak, ikisinin
   * zamanla ayrışacağı bir kopya üretirdi (geçmişten taşananlar kuralı
   * orada yazılı).
   */
  const dayTasks = tasksForDay(tasks, today);

  let tasksDone = 0;
  let minutes = 0;

  for (const t of dayTasks) {
    if (!t.done) continue;
    tasksDone += 1;
    if (t.startTime !== null && t.durationMinutes !== null) {
      minutes += t.durationMinutes;
    }
  }

  return {
    routines: { done: routinesDone, total: routinesTotal },
    tasks: { done: tasksDone, total: dayTasks.length },
    minutes,
    reviews: { due: dueMistakes(mistakes, today).length },
  };
}
