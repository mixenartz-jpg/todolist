/**
 * Hızlı panelin veri modeli — saf mantık.
 *
 * ── Ne işe yarıyor? ──
 * Widget her sayfada duruyor ve tek bir soruyu cevaplıyor: "bugün ne
 * kaldı". Kullanıcı Planlama'da ay kurarken ya da İstatistik'e
 * bakarken bugünün bir işini işaretlemek isterse, Bugün sekmesine
 * gidip geri dönmek zorunda kalmamalı — o gidiş dönüş, yaptığı işin
 * bağlamını kaybettiriyor.
 *
 * ── Neden ayrı bir modül? ──
 * Listenin hangi görevleri içerdiği ve hangi sırada durduğu BİR
 * KARAR ve o karar Bugün ekranıyla aynı olmak zorunda. Bileşene
 * gömülseydi iki liste sessizce ayrışırdı: widget'ta görünen iş
 * Bugün'de görünmeyebilirdi.
 */

import type { DateStr } from "@/lib/date/types";
import { orderForDay } from "@/features/tasks/dayorder";
import { tasksForDay } from "@/features/tasks/queries";
import type { Task } from "@/features/tasks/types";

/** Widget'ın gösterdiği liste — Bugün ekranıyla AYNI küme ve sıra. */
export function quickPanelTasks(
  tasks: readonly Task[],
  today: DateStr,
): Task[] {
  return orderForDay(tasksForDay(tasks, today));
}

/**
 * Kapalı şeritte yazan sayı: bugün kaç iş açık.
 *
 * Tamamlananlar SAYILMAZ ama listeden de düşmez (bkz. `orderForDay`:
 * işaretlenen görev yerinde kalır). Şerit "ne kaldı" sorusunu
 * cevaplıyor; liste "bugün ne vardı" sorusunu.
 */
export function openTaskCount(
  tasks: readonly Task[],
  today: DateStr,
): number {
  return quickPanelTasks(tasks, today).filter((t) => !t.done).length;
}

/**
 * Widget hiç gösterilmeli mi?
 *
 * Bugün için hiç iş yoksa şerit de görünmez. Sıfır yazan bir sayaç,
 * her sayfanın köşesinde duran ve hiçbir şey söylemeyen bir gürültü
 * olurdu — üstelik "bugün hiç iş yok" bilgisi zaten Panel'de ve
 * Bugün'de yazıyor.
 */
export function shouldShowPanel(
  tasks: readonly Task[],
  today: DateStr,
): boolean {
  return quickPanelTasks(tasks, today).length > 0;
}
