"use client";

import { useCallback, useState } from "react";
import type { DateStr } from "@/lib/date/types";
import { DersRow } from "./DersRow";
import type { DersNode, KonuNode } from "./tree";
import type { Mistake } from "./types";

interface MistakeTreeProps {
  tree: readonly DersNode[];
  today: DateStr;
  onEdit: (mistake: Mistake) => void;
  onDelete: (mistake: Mistake) => void;
  onReviewed: (mistake: Mistake) => void;
  reviewPending: boolean;
  /** Ders adını değiştirme isteği — ekran onay kutusunu açar. */
  onRenameDers: (ders: DersNode, next: string) => void;
  /** Konu adını değiştirme isteği; ders bağlamıyla birlikte. */
  onRenameKonu: (ders: DersNode, konu: KonuNode, next: string) => void;
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
  onRenameDers,
  onRenameKonu,
}: MistakeTreeProps) {
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(new Set());

  /*
   * Yeniden adlandırılan düğüm — aynı anda EN FAZLA BİR tane.
   * Açık düğümlerin aksine burada çoklu duruma izin verilmez: iki
   * satırı birden yeniden adlandırmak diye bir iş yoktur ve açık
   * bırakılan ikinci kutu, kullanıcı hangisini kaydettiğini
   * karıştırırdı. `nodeKey` kullanılır çünkü ders ve konu anahtarları
   * `tree.ts`'te zaten çakışmayacak biçimde üretiliyor.
   */
  const [renamingKey, setRenamingKey] = useState<string | null>(null);

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
          renamingKey={renamingKey}
          onStartRename={(node) => setRenamingKey(node.nodeKey)}
          onStartRenameKonu={(_ders, konu) => setRenamingKey(konu.nodeKey)}
          onCancelRename={() => setRenamingKey(null)}
          onRename={(node, next) => {
            // Kutu HEMEN kapanır; onay kutusu ekranın işidir ve
            // arkasında açık bir düzenleme alanı bırakmak, onaydan
            // sonra neyin kaldığını belirsizleştirirdi.
            setRenamingKey(null);
            onRenameDers(node, next);
          }}
          onRenameKonu={(dersNode, konu, next) => {
            setRenamingKey(null);
            onRenameKonu(dersNode, konu, next);
          }}
        />
      ))}
    </ul>
  );
}
