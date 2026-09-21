/**
 * Arşivin veri modeli — saf mantık.
 *
 * Arşiv "hangi gün ne bitirdim" sorusunu cevaplıyor. Bugün ekranından
 * farkı bakış yönü: orası ileriye ("ne yapmalıyım"), burası geriye
 * ("ne yaptım"). İkisi aynı veriyi okuyor ama farklı eksende
 * grupluyor — biri `due_date`, öteki `completed_at`.
 */

import { toDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";

/** Arşivde bir gün: o gün bitirilen işler. */
export interface ArchiveDay {
  date: DateStr;
  tasks: Task[];
}

/**
 * Bir görevin arşivde hangi güne düştüğü.
 *
 * `completed_at` varsa O GÜN — çünkü arşivin sorusu "ne zaman
 * bitirdim", "ne zaman için planlamıştım" değil. Dün için planlanıp
 * bugün bitirilen bir iş dünkü listede görünseydi, arşiv o günü
 * yapılmamış gösterirken bugünü boş gösterirdi: iki gün birden yalan.
 *
 * `null` ise `due_date`'e düşer. Bu, 0017 ÖNCESİNDE bitirilmiş
 * görevlerin durumu ve bilerek böyle: geriye dönük bir zaman
 * uydurmak yerine, elimizdeki en yakın gerçeğe yaslanıyoruz.
 *
 * İkisi de yoksa `null` — tarihsiz ve damgasız bir görev arşivde
 * hiçbir güne ait değil ve uydurulacak bir yeri de yok.
 */
export function archiveDate(task: Task): DateStr | null {
  if (task.completedAt !== null) {
    /*
     * Damga YEREL güne çevriliyor, UTC gününe değil.
     *
     * Kullanıcı gece 00:30'da bir iş bitirdiğinde onu kendi
     * takvimindeki güne yazmalıyız. `toDateStr` yerel alanları
     * okuyor (bkz. `lib/date/date.ts`) — `toISOString().slice(0,10)`
     * kullanılsaydı Türkiye'de gece yarısından sonra bitirilen her
     * iş bir ÖNCEKİ güne düşerdi.
     */
    return toDateStr(new Date(task.completedAt));
  }

  return task.dueDate;
}

/**
 * Biten görevleri güne göre gruplar, EN YENİ gün başta.
 *
 * Açık görevler hiç girmiyor: arşiv bitmiş işlerin yeri ve açık bir
 * işi buraya koymak, onu "yapıldı" listesinde göstermek olurdu.
 */
export function groupByCompletedDay(
  tasks: readonly Task[],
): ArchiveDay[] {
  const byDate = new Map<DateStr, Task[]>();

  for (const task of tasks) {
    if (!task.done) continue;

    const date = archiveDate(task);
    if (date === null) continue;

    const bucket = byDate.get(date);
    if (bucket) bucket.push(task);
    else byDate.set(date, [task]);
  }

  return [...byDate.entries()]
    .map(([date, dayTasks]) => ({
      date,
      /*
       * Gün İÇİNDE sıra: `sortOrder`, eşitlikte `id`. `completed_at`'e
       * göre sıralamak daha doğru görünüyor ama 0017 öncesi görevlerde
       * o damga yok ve karışık bir listede bazıları saate, bazıları
       * sıraya göre dizilirdi. Tek kural, her satırda geçerli.
       */
      tasks: [...dayTasks].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      }),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
