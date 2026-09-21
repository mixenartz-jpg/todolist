/**
 * Akşam rutininin saf mantığı.
 *
 * ── Saat eşiği neden burada? ──
 * "Akşam oldu mu" bir KARAR ve bileşene gömülseydi test edilemezdi:
 * bu depoda yalnızca `.test.ts` çalışıyor. Ayrıca eşiğin kendisi
 * tartışmalı bir sayı ve tartışmalı sayılar gerekçesiyle birlikte,
 * tek bir yerde durmalı.
 */

import { addDays, diffDays } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";

/**
 * Akşam rutininin açıldığı saat.
 *
 * 18:00 DEĞİL 20:00: 18'de çoğu insan hâlâ günün ortasında ve "günü
 * kapatalım" daveti, henüz yapılacak işi olan birine erken bir
 * teslimiyet teklifi gibi gelir. 22:00 ise çok geç — o saatte yarını
 * planlamak, yorgun bir zihinden iyimser bir liste çıkarır.
 */
export const EVENING_HOUR = 20;

/**
 * Şu an akşam rutini gösterilmeli mi?
 *
 * `hour` PARAMETRE: `new Date().getHours()` çağıran bir fonksiyon
 * test edilemez ve gece yarısını geçen bir oturumda sessizce başka
 * bir gün hakkında konuşmaya başlar (`lib/date/date.ts` dışında
 * `new Date()` yasak).
 *
 * Gece yarısından sonra (0-3 arası) HÂLÂ akşam sayılıyor: 00:30'da
 * hâlâ ayakta olan biri için gün bitmemiştir ve davetin kaybolması,
 * tam da onu en çok kullanacak kişiden kaçırmak olurdu.
 */
export function isEvening(hour: number): boolean {
  return hour >= EVENING_HOUR || hour < 4;
}

/**
 * Bugün taşınan (gecikmiş) iş sayısı.
 *
 * Koçun yarına dair önerisi buradan çıkıyor: geçmişten devreden iş
 * çoksa yarına az koymak gerekir. Bu bir slogan değil, ölçüm —
 * "yapabilirsin!" demek yerine "dün 3 iş taşıdın" diyoruz.
 */
export function carriedCount(
  tasks: readonly Task[],
  today: DateStr,
): number {
  return tasks.filter(
    (t) => !t.done && t.dueDate !== null && t.dueDate < today,
  ).length;
}

/** Akşam sheet'inde bir işe verilebilecek kararlar. */
export type EveningAction = "tomorrow" | "backlog" | "keep";

/**
 * Yarın için önerilen azami iş sayısı.
 *
 * ── Neden sabit bir sayı değil? ──
 * "Yarına 3 iş koy" herkese ve her güne aynı şeyi söyler. Buradaki
 * sayı GEÇMİŞTEN türetiliyor: bugün çok iş taşıdıysan, yarın da
 * taşıma ihtimalin yüksek ve daha az koymak gerçekçi.
 *
 * Taban 5, taşınan her iş bir azaltıyor, alt sınır 2. Alt sınır şart:
 * "yarına 0 iş koy" bir öneri değil, bir vazgeçme çağrısı olurdu.
 */
export function suggestedTomorrowLoad(carried: number): number {
  return Math.max(2, 5 - carried);
}

/**
 * Bir görev kaç gündür taşınıyor?
 *
 * `null` → taşınmıyor (tarihsiz ya da bugüne/geleceğe ait). Sheet'te
 * "4 gündür taşınıyor" yazmak için: bir işin kaç kez ertelendiğini
 * görmek, onu havuza atma kararını kolaylaştırıyor.
 */
export function carriedDays(task: Task, today: DateStr): number | null {
  if (task.done || task.dueDate === null) return null;
  if (task.dueDate >= today) return null;

  // `diffDays(a, b)` = a - b; taşınan gün sayısı POZİTİF olmalı.
  return diffDays(today, task.dueDate);
}

/** Yarının tarihi — sheet'in "yarına taşı" eylemi için. */
export function tomorrow(today: DateStr): DateStr {
  return addDays(today, 1);
}
