"use client";

import { useState } from "react";
import { rangeSelect } from "./marks";

/**
 * Katalog seçimi: bölüm → seçili birim numaraları. Tık seçer/bırakır,
 * shift+tık son tıklanandan bu yana aralığı ekler. Birden çok bölüm ve
 * seriden seçim yapılabilir ("Güne ekle" her seri için ayrı görev açar).
 */
export function useCatalogSelection() {
  const [sel, setSel] = useState<ReadonlyMap<string, ReadonlySet<number>>>(new Map());
  const [anchor, setAnchor] = useState<{ sectionId: string; n: number } | null>(null);

  function pick(sectionId: string, n: number, shift: boolean) {
    setSel((prev) => {
      const next = new Map(prev);
      const a = anchor && anchor.sectionId === sectionId ? anchor.n : null;
      const set = rangeSelect(prev.get(sectionId) ?? new Set(), a, n, shift);
      if (set.size === 0) next.delete(sectionId);
      else next.set(sectionId, set);
      return next;
    });
    setAnchor({ sectionId, n });
  }

  function selectOnly(sectionId: string, numbers: readonly number[]) {
    setSel(numbers.length ? new Map([[sectionId, new Set(numbers)]]) : new Map());
    setAnchor(numbers.length ? { sectionId, n: numbers[numbers.length - 1] } : null);
  }

  function clear() {
    setSel(new Map());
    setAnchor(null);
  }

  const count = [...sel.values()].reduce((n, s) => n + s.size, 0);
  return { sel, pick, selectOnly, clear, count };
}

export type CatalogSelection = ReturnType<typeof useCatalogSelection>;
