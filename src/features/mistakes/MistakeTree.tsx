"use client";

import { useCallback, useState } from "react";
import type { DateStr } from "@/lib/date/types";
import { DersRow } from "./DersRow";
import type { DersNode } from "./tree";
import type { Mistake } from "./types";

interface MistakeTreeProps {
  tree: readonly DersNode[];
  today: DateStr;
  onEdit: (mistake: Mistake) => void;
  onDelete: (mistake: Mistake) => void;
  onReviewed: (mistake: Mistake) => void;
  reviewPending: boolean;
}

/**
 * Ders → konu → yanlış ağacı.
 *
 * ── Açık düğümler TEK bir Set'te ──
 * Üç seviye için üç ayrı state tutmak, her seviyeye ayrı bir prop çifti
 * indirmek demekti. Düğüm kimlikleri `tree.ts`'te zaten çakışmayacak
 * biçimde üretiliyor (`d:`, `k:`, `m:` önekleri), dolayısıyla tek Set
 * yeter ve `isOpen`/`toggle` ikilisi değişmeden aşağı iner.
 *
 * ── Dersler KAPALI başlar ──
 * Üç seviye açık başlasa ekran ilk açılışta yüzlerce satır olurdu.
 * Sayılar, ısı şeridi ve tekrar rozeti kapalı satırda zaten görünüyor:
 * özet, hiçbir şey açmadan alınıyor.
 *
 * ── Aynı anda birden çok dal açık kalabilir ──
 * Akordeon kilidi yok; iki konuyu yan yana karşılaştırmak yaygın bir
 * ihtiyaç ve kilit onu imkânsız kılardı.
 *
 * Durum kalıcı değildir: sayfadan çıkınca sıfırlanır.
 */
export function MistakeTree({
  tree,
  today,
  onEdit,
  onDelete,
  onReviewed,
  reviewPending,
}: MistakeTreeProps) {
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(new Set());

  const isOpen = useCallback((key: string) => openKeys.has(key), [openKeys]);

  const toggle = useCallback((key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <ul className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
      {tree.map((ders) => (
        <DersRow
          key={ders.nodeKey}
          ders={ders}
          today={today}
          isOpen={isOpen}
          onToggle={toggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onReviewed={onReviewed}
          reviewPending={reviewPending}
        />
      ))}
    </ul>
  );
}
