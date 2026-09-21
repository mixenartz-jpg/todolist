/**
 * "Şimdi bu" — sıradaki iş seçimi. Saf mantık.
 *
 * ── Neden ayrı bir seçim gerekiyor? ──
 * Liste "bugün ne var" sorusunu cevaplıyor; koç "şimdi ne yapmalıyım"
 * sorusunu cevaplamalı. İkisi aynı veri üzerinden konuşuyor ama farklı
 * sorular: on maddelik bir listeye bakan kişi hangisine başlayacağına
 * karar vermek zorunda kalır ve o karar, işin kendisinden daha çok
 * enerji yer.
 *
 * ── Sıra kuralı `orderForDay` ile AYNI olmak zorunda ──
 * Kart "sıradaki" diyorsa, listede de o görev sırada görünmeli. İki
 * ayrı sıralama yazmak, kartın listenin ortasından rastgele bir işi
 * işaret etmesi demekti — ve hangisini gösterdiği kullanıcıya hiçbir
 * zaman açıklanamazdı.
 */

import type { DateStr } from "@/lib/date/types";
import { orderForDay } from "@/features/tasks/dayorder";
import { isOverdue } from "@/features/tasks/queries";
import type { Task } from "@/features/tasks/types";

/**
 * Şimdi yapılacak tek iş.
 *
 * `null` → bugün için açık iş kalmadı. Bu bir hata değil, kutlanacak
 * bir durum: kart o zaman akşam rutinine davet eder.
 *
 * ── Gecikmişler neden ÖNDE? ──
 * Taşan bir iş zaten bir kez ertelenmiş demektir ve ikinci kez
 * ertelenmesi onu kalıcı olarak dibe iter. Uygulamanın güvenilir
 * olması verilen sözün görünür kalmasına bağlı (bkz. `tasksForDay`);
 * koç da en eski borcu önce hatırlatmalı.
 *
 * Gecikmişler kendi aralarında TARİHE göre sıralanır, `sortOrder`'a
 * göre değil: iki farklı günden taşan iki işin `sortOrder`'ları
 * birbiriyle karşılaştırılamaz — her biri kendi gününün sırasını
 * taşıyor ve "0" iki ayrı günde iki ayrı anlama geliyor.
 */
export function nextTask(
  tasks: readonly Task[],
  today: DateStr,
): Task | null {
  const open = tasks.filter((t) => !t.done);
  if (open.length === 0) return null;

  const overdue = open.filter((t) => isOverdue(t, today));

  if (overdue.length > 0) {
    return [...overdue].sort((a, b) => {
      // `dueDate` burada asla null değil: `isOverdue` onu eledi.
      if (a.dueDate !== b.dueDate) return a.dueDate! < b.dueDate! ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    })[0];
  }

  return orderForDay(open)[0];
}

/**
 * Bugün kaç iş açık kaldı?
 *
 * Kartın alt satırı için: "şimdi bu" tek bir işi gösterirken, arkada
 * kaç iş beklediğini bilmek kullanıcının günü ölçmesini sağlar. Sayı
 * olmadan kart, arkasında bir tane de olsa yirmi tane de olsa aynı
 * görünürdü.
 */
export function openCount(tasks: readonly Task[]): number {
  return tasks.filter((t) => !t.done).length;
}
