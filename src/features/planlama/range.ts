/**
 * Plan ekranının veri modeli — saf mantık.
 *
 * ── `buildWeekPlan` neden YENİDEN KULLANILMIYOR? ──
 * O fonksiyon yedi sabit sütun ve tek bir ölçek varsayar. Plan ekranı
 * hem hafta hem ay ızgarasını beslemeli ve ay ızgarasında komşu aydan
 * taşan hücreler var — "bu gün görüntülenen aya ait mi?" sorusu
 * haftalık planda hiç yok. Ayrıca burada tarihsiz görevler DÖNDÜRÜLÜR;
 * `buildWeekPlan` onları bilerek atıyor.
 *
 * `buildWeekPlan` bilerek DEĞİŞTİRİLMEDİ: Hafta ekranı mevcut
 * davranışını korur. İki fonksiyon aynı kovalama desenini paylaşır ama
 * farklı sorulara cevap verir.
 *
 * ── `tasksForDay` neden KULLANILMIYOR? ──
 * `week.ts`'teki gerekçenin aynısı: `tasksForDay` geçmişteki
 * tamamlanmamışları da o güne taşır. Bugün ekranında bu doğrudur, ama
 * bir ızgarada Pazartesi'ye tarihli yapılmamış bir görev Pzt'den Paz'a
 * her sütunda görünür ve sayaçlar birbirini yerdi. Izgarada her hücre
 * YALNIZCA o güne tarihlenenleri gösterir; gecikenler ayrı bir kovada
 * toplanır çünkü onlar hiçbir güne değil "şimdi"ye aittir.
 *
 * ── Gecikme eşiği neden `today` değil? ──
 * Eşik görüntülenen aralığın BAŞIDIR. `< today` yazılsaydı, aralık
 * içinde kalan yapılmamış bir görev hem kendi hücresinde hem gecikme
 * kovasında iki kez görünürdü.
 */

import type { DateStr } from "@/lib/date/types";
import { startOfIsoWeek, startOfMonth, toParts } from "@/lib/date/date";
import type { Task } from "@/features/tasks/types";

/** Planın ölçeği: bir hafta mı, bir ay mı? */
export type PlanScale = "week" | "month";

/** Izgaranın tek bir gün hücresi. */
export interface PlanBucket {
  date: DateStr;
  /** YALNIZCA o güne tarihlenenler. Geçmişten taşma yok. */
  tasks: Task[];
  openCount: number;
  doneCount: number;
  /**
   * Görüntülenen aralığa mı ait? Ay ızgarasında komşu aydan taşan
   * hücreler için `false` — soluk çizilirler ama gerçek günlerdir ve
   * görev alabilirler.
   */
  inScope: boolean;
}

export interface PlanRange {
  /** Hafta ölçeğinde 7, ay ölçeğinde 35 veya 42 hücre. */
  buckets: PlanBucket[];
  /**
   * Tarihsiz ve tamamlanmamış görevler ("bir ara").
   *
   * Tamamlanmışlar DIŞARIDA: havuz yapılacak işlerin beklediği yerdir,
   * bitmiş bir işin orada durması için bir sebep yok ve havuzu
   * kalabalıklaştırırdı.
   */
  backlog: Task[];
  /** Aralığın BAŞINDAN önceye tarihli, tamamlanmamış görevler. */
  overdue: Task[];
  /** Yalnızca aralık İÇİNDEKİ (inScope) hücrelerin toplamı. */
  openTotal: number;
  doneTotal: number;
}

/**
 * Plan aralığını kurar.
 *
 * `dates` ızgaranın çizeceği günlerdir (hafta için 7 gün, ay için
 * `monthGrid` hücreleri). `scopeStart`/`scopeEnd` ise asıl aralıktır —
 * ay ızgarasında taşma günleri bu aralığın dışında kalır. Hafta
 * ölçeğinde ikisi aynı sınırları gösterir.
 *
 * Izgara günlerini dışarıdan almak, ay hücrelerini burada ikinci kez
 * hesaplamamayı sağlar: `monthGrid` zaten Pazartesi başlangıcını ve
 * taşmayı biliyor.
 */
export function buildPlanRange(
  tasks: readonly Task[],
  dates: readonly DateStr[],
  scopeStart: DateStr,
  scopeEnd: DateStr,
): PlanRange {
  // Izgaranın çizdiği ilk ve son gün; taşma günleri scope'un dışında
  // olabilir, o yüzden kovalama sınırı bunlardır.
  const gridStart = dates.length > 0 ? dates[0] : scopeStart;
  const gridEnd = dates.length > 0 ? dates[dates.length - 1] : scopeEnd;

  // Tek geçişte kovalama: görev sayısı yüzlerle ölçülür, hücre başına
  // ayrı filtre 42 kez dolaşmak olurdu.
  const byDate = new Map<DateStr, Task[]>();
  const backlog: Task[] = [];
  const overdue: Task[] = [];

  for (const task of tasks) {
    if (task.dueDate === null) {
      if (!task.done) backlog.push(task);
      continue;
    }

    /*
     * Gecikme eşiği IZGARANIN başıdır, scope'un değil.
     *
     * Ay ızgarasında komşu aydan taşan günler scope'un dışındadır ama
     * EKRANDA ÇİZİLİR. Eşik `scopeStart` olsaydı, 30 Temmuz'a tarihli
     * bir görev hem kendi hücresinde hem gecikme şeridinde iki kez
     * görünürdü — `week.ts`'te anlatılan çifte sayımın ta kendisi.
     * Görünen bir gün "gecikmiş" değildir; kullanıcı ona bakıyor.
     */
    if (task.dueDate < gridStart) {
      if (!task.done) overdue.push(task);
      continue;
    }

    if (task.dueDate > gridEnd) continue;

    const bucket = byDate.get(task.dueDate);
    if (bucket) bucket.push(task);
    else byDate.set(task.dueDate, [task]);
  }

  let openTotal = 0;
  let doneTotal = 0;

  const buckets = dates.map((date): PlanBucket => {
    const dayTasks = byDate.get(date) ?? [];
    const doneCount = dayTasks.filter((t) => t.done).length;
    const openCount = dayTasks.length - doneCount;
    const inScope = date >= scopeStart && date <= scopeEnd;

    // Toplamlar YALNIZCA scope içini sayar: ay başlığındaki "12 iş"
    // rakamı komşu aydan taşan günleri içerseydi, ay değiştirildiğinde
    // aynı görev iki ayda birden sayılırdı.
    if (inScope) {
      openTotal += openCount;
      doneTotal += doneCount;
    }

    return { date, tasks: dayTasks, openCount, doneCount, inScope };
  });

  return { buckets, backlog, overdue, openTotal, doneTotal };
}

/**
 * Kovaları haftalık satırlara böler.
 *
 * Ay ızgarası hafta hafta çizilir: her satır kendi başlığını taşır ve
 * aşağı kaydırırken hangi haftada olunduğu kaybolmaz.
 *
 * `calendar/grid.ts`'teki `toWeeks`'ten AYRI: o `CalendarCell` dizisi
 * bekler, buradaki kova dizisini böler. Ortak bir generic yazmak iki
 * modülü beş satır uğruna birbirine bağlardı ve `grid.test.ts` hücre
 * şeklini doğruluyor.
 *
 * Son satır EKSİK KALMAZ: `monthGrid` daima 7'nin katı hücre döner, ama
 * artan olursa kısa bir satır olarak döndürülür — sessizce düşürmek
 * ekrandan gün yerdi.
 */
export function chunkWeeks(buckets: readonly PlanBucket[]): PlanBucket[][] {
  const weeks: PlanBucket[][] = [];

  for (let i = 0; i < buckets.length; i += 7) {
    weeks.push(buckets.slice(i, i + 7));
  }

  return weeks;
}

/**
 * Ölçek değişince çapa hangi güne oturur?
 *
 * Çapa, ölçeğin ilk günüdür: hafta için Pazartesi, ay için ayın 1'i.
 * Ölçek değiştirmek kullanıcıyı takvimde başka bir yere ışınlamamalı —
 * baktığı zaman aralığı korunur, yalnızca yakınlaşma değişir.
 *
 * Aydan haftaya geçerken hangi hafta? Bugün o aydaysa bugünün haftası;
 * değilse ayın ilk haftası. "Ağustos'a bakıyordum, hafta dedim ve
 * Ağustos'un ilk haftasını gördüm" beklenen davranıştır; bugüne
 * ışınlanmak ise bakılan ayı kaybettirirdi.
 */
export function anchorForScale(
  anchor: DateStr,
  to: PlanScale,
  today: DateStr,
): DateStr {
  if (to === "month") return startOfMonth(anchor);

  const monthStart = startOfMonth(anchor);
  const parts = toParts(anchor);
  const todayParts = toParts(today);

  const sameMonth =
    parts.year === todayParts.year && parts.month === todayParts.month;

  return startOfIsoWeek(sameMonth ? today : monthStart);
}
