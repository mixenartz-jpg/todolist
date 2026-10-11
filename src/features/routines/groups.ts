/**
 * Rutinlerin kategoriye göre gruplanması — saf mantık.
 *
 * Kategoriler görevlerle ORTAK (0027). Rutinler ekranı grupları bu
 * fonksiyonla çizer, Bugün ekranı aynı sırayı `orderByCategory` ile
 * düz bir liste olarak okur: iki ekranın sırası yapısal olarak aynı.
 */

import type { Category } from "@/features/planlama/types";
import type { Sortable, SortOrderPatch } from "@/features/planlama/reorder";

export interface RoutineGroup<R> {
  /** null → "Kategorisiz". */
  category: Category | null;
  routines: R[];
}

/**
 * Rutinleri kategori sırasıyla gruplar.
 *
 * - Etkin kategoriler, BOŞ olsalar da gruptur: kullanıcı kategoriyi
 *   açıp içine rutin ekleyebilmeli.
 * - Arşivlenmiş kategori yalnızca hâlâ rutini varsa görünür (sona).
 * - Bilinmeyen kategoriye bağlı rutin (silinmiş, henüz yüklenmemiş)
 *   "Kategorisiz"e düşer — kaybolmaz.
 * - "Kategorisiz" en sonda ve yalnızca doluysa; hiç kategori yoksa
 *   tek grup odur.
 * - Grup içindeki sıra girdinin sırasıdır (`sort_order`).
 */
export function groupRoutines<R extends { categoryId: string | null }>(
  routines: readonly R[],
  categories: readonly Category[],
): RoutineGroup<R>[] {
  const byCategory = new Map<string, R[]>();
  const uncategorized: R[] = [];
  const known = new Set(categories.map((c) => c.id));

  for (const routine of routines) {
    if (routine.categoryId === null || !known.has(routine.categoryId)) {
      uncategorized.push(routine);
      continue;
    }
    const list = byCategory.get(routine.categoryId) ?? [];
    list.push(routine);
    byCategory.set(routine.categoryId, list);
  }

  const groups: RoutineGroup<R>[] = [];
  for (const archived of [false, true]) {
    for (const category of categories) {
      if ((category.archivedAt !== null) !== archived) continue;
      const list = byCategory.get(category.id) ?? [];
      if (archived && list.length === 0) continue;
      groups.push({ category, routines: list });
    }
  }

  if (uncategorized.length > 0 || groups.length === 0) {
    groups.push({ category: null, routines: uncategorized });
  }

  return groups;
}

/** Grupların düzleştirilmiş hâli — Bugün ekranındaki rutin sırası. */
export function orderByCategory<R extends { categoryId: string | null }>(
  routines: readonly R[],
  categories: readonly Category[],
): R[] {
  return groupRoutines(routines, categories).flatMap((g) => g.routines);
}

/**
 * Başka bir gruptan gelen rutini `target` grubunun `index` konumuna
 * yerleştirir; grubun tamamı 0..n numaralanır. Sürüklenen rutin HER
 * ZAMAN yamada yer alır — kategorisi değiştiği için zaten yazılacak.
 *
 * `index` = hedef listenin uzunluğu → sona ekler (grup başlığına
 * bırakma).
 */
export function planMoveToGroup(
  target: readonly Sortable[],
  moved: Sortable,
  index: number,
): SortOrderPatch[] {
  const at = Math.max(0, Math.min(index, target.length));
  const next = [...target.filter((r) => r.id !== moved.id)];
  next.splice(at, 0, moved);

  const patches: SortOrderPatch[] = [];
  for (let i = 0; i < next.length; i++) {
    if (next[i].id === moved.id || next[i].sortOrder !== i) {
      patches.push({ id: next[i].id, sortOrder: i });
    }
  }
  return patches;
}
