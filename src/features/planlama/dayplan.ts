/**
 * Gün panelinin ve ay hücresinin veri modeli — saf mantık.
 *
 * Ay ızgarasında hücre ~40px eder; içine ne görev başlığı ne plan metni
 * sığar. Hücre "bu günde ne var" sorusuna İKİ ayrı işaretle cevap
 * verir ve ikisi birbirinin yerine geçmez:
 *
 *   sayı  → açık iş adedi
 *   nokta → o güne plan YAZILMIŞ
 *
 * Planı yazılmış ama hiç görevi olmayan bir gün de "dolu"dur ("sabah
 * kütüphane, öğleden sonra dinlenme") ve bunu yalnızca sayı
 * gösteremezdi.
 */

import type { DateStr } from "@/lib/date/types";
import { splitDaySchedule } from "@/features/tasks/schedule";
import type { Task } from "@/features/tasks/types";
import type { PlanBucket } from "./range";

/** Ay ızgarasındaki bir hücrenin göstereceği bilgi. */
export interface DaySummary {
  openCount: number;
  doneCount: number;
  hasPlan: boolean;
}

/** Gün panelinin tam içeriği. */
export interface DayPlanView {
  date: DateStr;
  /** Serbest metin plan (day_notes.plan). Boşsa null. */
  plan: string | null;
  /** Saatliler saate göre, sonra saatsizler. */
  ordered: Task[];
  total: number;
  done: number;
  /** Saati OLAN işlerin toplam süresi, dakika. */
  minutes: number;
  summary: DaySummary;
}

/**
 * Bir metin "plan yazılmış" sayılır mı?
 *
 * Yalnızca boşluktan oluşan bir metin YAZILMAMIŞ sayılır: kullanıcı
 * metni silip boşluk bıraktığında hücrede nokta durup panel boş
 * açılırsa, işaret yalan söylemiş olur. Kural tek bir yerde tanımlı ki
 * hücre ile panel asla ayrışmasın.
 */
export function hasPlanText(plan: string | null): boolean {
  return plan !== null && plan.trim().length > 0;
}

/**
 * Gün panelini kurar.
 *
 * Sıralama `splitDaySchedule` ile — Bugün ekranı, hafta ızgarası ve bu
 * panel AYNI kuralı paylaşır. Ayrı bir sıralama yazmak, aynı günün üç
 * ekranda farklı sırada görünmesi demek olurdu.
 */
export function buildDayPlan(
  tasks: readonly Task[],
  date: DateStr,
  plan: string | null,
): DayPlanView {
  const { timed, untimed } = splitDaySchedule(tasks);
  const ordered = [...timed, ...untimed];

  let done = 0;
  let minutes = 0;

  for (const task of ordered) {
    if (task.done) done += 1;

    /*
     * Süre yalnızca SAATİ OLAN işlerden toplanır. Veritabanı kısıtı
     * zaten saatsiz süreye izin vermiyor (0006: "45 dakika ama ne
     * zaman?" bir plan değildir), ama burada da kontrol edilir ki
     * bozuk bir satır toplamı sessizce şişirmesin.
     */
    if (task.startTime !== null && task.durationMinutes !== null) {
      minutes += task.durationMinutes;
    }
  }

  const normalizedPlan = hasPlanText(plan) ? plan : null;

  return {
    date,
    plan: normalizedPlan,
    ordered,
    total: ordered.length,
    done,
    minutes,
    summary: {
      openCount: ordered.length - done,
      doneCount: done,
      hasPlan: normalizedPlan !== null,
    },
  };
}

/**
 * ay ızgarasındaki tüm hücrelerin özeti.
 *
 * `planDays` yalnızca planı YAZILMIŞ günleri içerir; kümede olmayan
 * gün "plansız"dır. 0007'nin "yazılmamış anahtar = varsayılan"
 * kuralıyla aynı yön: eksik olan bir hata değil, bir durum.
 *
 * Kovaların sayaçları YENİDEN HESAPLANMAZ, `buildPlanRange`'inkiler
 * kullanılır — iki yerde sayılsaydı biri filtreyi görüp öteki
 * görmediğinde sessizce ayrışırlardı.
 */
export function daySummaries(
  buckets: readonly PlanBucket[],
  planDays: ReadonlySet<DateStr>,
): Map<DateStr, DaySummary> {
  const out = new Map<DateStr, DaySummary>();

  for (const bucket of buckets) {
    out.set(bucket.date, {
      openCount: bucket.openCount,
      doneCount: bucket.doneCount,
      hasPlan: planDays.has(bucket.date),
    });
  }

  return out;
}
