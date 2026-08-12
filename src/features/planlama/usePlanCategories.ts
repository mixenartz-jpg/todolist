"use client";

import { useMemo } from "react";
import type { Task } from "@/features/tasks/types";
import { filterByCategory } from "./filter";
import { activeCategories, categoryMap, useCategories } from "./queries";
import type { Category, CategoryFilter } from "./types";

export interface PlanCategories {
  /** Tümü — arşivlenmişler dahil; satır noktaları için. */
  all: readonly Category[];
  /** Filtre çubuğunda ve seçicide gösterilecekler. */
  active: Category[];
  categoryById: ReadonlyMap<string, Category>;
  /** Filtre uygulanmış görevler. */
  visible: readonly Task[];
  /** Kategori başına AÇIK iş sayısı — çip rozetleri. */
  counts: ReadonlyMap<string, number>;
  uncategorizedCount: number;
}

/**
 * Kategori verisi + filtre uygulaması — Ay ve Hafta ekranlarının ortak
 * ihtiyacı.
 *
 * ── Sayaçlar neden FİLTRELENMEMİŞ listeden hesaplanıyor? ──
 * Çipteki rakam "bu kategoriye basarsam kaç iş görürüm" sorusunu
 * cevaplar. Filtrelenmiş listeden sayılsaydı, "Matematik" seçiliyken
 * "Spor" çipi 0 gösterirdi ve kullanıcı ona basmaktan vazgeçerdi —
 * oysa basınca dolu bir liste bulacaktı.
 *
 * Yalnızca AÇIK işler sayılır: rozet "yapılacak ne kaldı" der. Bitmiş
 * işleri de saysaydı sayı hiç azalmaz ve ilerleme hissi kaybolurdu.
 */
export function usePlanCategories(
  tasks: readonly Task[] | undefined,
  filter: CategoryFilter,
): PlanCategories {
  const categoriesQuery = useCategories();

  return useMemo(() => {
    const all = categoriesQuery.data ?? [];
    const list = tasks ?? [];

    const counts = new Map<string, number>();
    let uncategorizedCount = 0;

    for (const task of list) {
      if (task.done) continue;
      if (task.categoryId === null) uncategorizedCount += 1;
      else counts.set(task.categoryId, (counts.get(task.categoryId) ?? 0) + 1);
    }

    return {
      all,
      active: activeCategories(all),
      categoryById: categoryMap(all),
      // `filterByCategory` filtre yokken AYNI referansı döner; bu memo
      // içinde de o özellik korunur ve alt memo'lar boşuna tetiklenmez.
      visible: filterByCategory(list, filter),
      counts,
      uncategorizedCount,
    };
  }, [categoriesQuery.data, tasks, filter]);
}
