/**
 * Görev süzgeçleri — saf mantık.
 *
 * ── Neden `buildPlanRange`'in İÇİNE konmadı? ──
 * O fonksiyon "görevleri günlere kova" sorusunu cevaplıyor; bu ise
 * "hangi görevler" sorusunu. İkisi bağımsızdır ve filtre ÖNCE
 * uygulanınca `buildPlanRange`'in tüm sayaçları — `openTotal`,
 * `doneTotal`, `overdue`, `backlog` — filtreye KENDİLİĞİNDEN uyar.
 * İçeriden filtrelemek her sayacı ayrı ayrı düzeltmeyi gerektirir ve
 * biri unutulduğunda "3 açık iş" yazan başlıkla iki satır gösteren
 * ızgara arasında sessiz bir tutarsızlık doğardı.
 *
 * `range.ts`'in "buildWeekPlan neden değiştirilmedi" muhakemesiyle
 * aynı ruhta: farklı sorular ayrı fonksiyonlarda kalır.
 */

import type { Task } from "@/features/tasks/types";
import type { CategoryFilter } from "./types";

/**
 * Görevleri kategoriye göre süzer.
 *
 * `filter === null` iken AYNI dizi referansı döner. Bu bir mikro
 * iyileştirme değil, gereklilik: çağıran taraf sonucu `useMemo`
 * bağımlılığı olarak kullanıyor ve her render'da yeni bir dizi
 * üretilseydi `buildPlanRange` hiç önbelleklenmez, ızgara boşuna
 * yeniden hesaplanırdı.
 */
export function filterByCategory(
  tasks: readonly Task[],
  filter: CategoryFilter,
): readonly Task[] {
  if (filter === null) return tasks;
  if (filter === "none") return tasks.filter((t) => t.categoryId === null);
  return tasks.filter((t) => t.categoryId === filter);
}

/**
 * Görevleri hedefe göre süzer.
 *
 * `goalId === null` "filtre yok" demektir, "hedefsizleri göster"
 * DEĞİL. `CategoryFilter`'daki `"none"` sentinel'inin karşılığı burada
 * yok çünkü hedef ekranında soru hep "bu hedefin işleri hangileri" —
 * "hiçbir hedefe bağlı olmayanlar" diye bir görünüm yok. İhtiyaç
 * doğarsa aynı sentinel deseni eklenir.
 */
export function filterByGoal(
  tasks: readonly Task[],
  goalId: string | null,
): readonly Task[] {
  if (goalId === null) return tasks;
  return tasks.filter((t) => t.goalId === goalId);
}
