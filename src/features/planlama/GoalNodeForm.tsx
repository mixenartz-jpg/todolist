"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { GOAL_NODE_TITLE_MAX, GOAL_NOTE_MAX, normalizeNodeTitle } from "./goal";
import type { GoalNode } from "./types";

interface GoalNodeFormProps {
  /** Düzenleme modunda mevcut düğüm; yoksa yeni başlık formu. */
  initial?: GoalNode;
  pending: boolean;
  /** Başlık ve not — düğümün yazılabilir alanlarının tamamı. */
  onSubmit: (values: { title: string; note: string | null }) => void;
  onCancel: () => void;
  /** Boş formda gösterilen ipucu; eklenen seviyeye göre değişir. */
  placeholder?: string;
}

/**
 * Plan düğümü oluşturma ve düzenleme formu.
 *
 * `GoalForm`'un kardeşi ve aynı deseni izler: tek bileşen hem
 * oluşturma hem düzenleme yapar (`initial` ile ayrılır), doğrulama saf
 * bir `.ts` fonksiyonunda (`normalizeNodeTitle`), submit düğmesi
 * geçersiz girdide devre dışı.
 *
 * ── `GoalForm`'dan farkları ──
 * Renk seçici YOK: düğüm rengini hedefinden alır, kendi kimliği
 * olması gereken bir şey değil — sekiz renkli bir palet üç seviyeli
 * bir ağaçta kimliği anlatmaz, gürültü yapar.
 *
 * Sayısal hedef alanı da YOK: düğümün ilerlemesi çocuklarından ve
 * bağlı görevlerinden TÜRETİLİR (nodeprogress.ts). Elle bir sayaç,
 * aynı gerçeğin ikinci kaynağı olurdu.
 */
export function GoalNodeForm({
  initial,
  pending,
  onSubmit,
  onCancel,
  placeholder = "Ne yapılacak?",
}: GoalNodeFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  const normalized = normalizeNodeTitle(title);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (normalized === null) return;

    onSubmit({
      title: normalized,
      note: note.trim() ? note.trim() : null,
    });

    // Yeni başlık formu açık kalır ve temizlenir: kullanıcı ağaç
    // kurarken arka arkaya kalem yazıyor, her seferinde butona basmak
    // ritmi kırardı. `TaskQuickAdd`'in "odakta kal" davranışıyla aynı.
    if (!initial) {
      setTitle("");
      setNote("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={GOAL_NODE_TITLE_MAX}
        placeholder={placeholder}
        aria-label="Başlık"
        autoFocus
        className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[length:var(--text-sm)] placeholder:text-[var(--color-ink-3)]"
      />

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={GOAL_NOTE_MAX}
        rows={2}
        placeholder="Not (isteğe bağlı)"
        aria-label="Başlık notu"
        className="w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[length:var(--text-xs)] leading-relaxed placeholder:text-[var(--color-ink-3)]"
      />

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          variant="primary"
          disabled={normalized === null}
          loading={pending}
        >
          {initial ? "Kaydet" : "Ekle"}
        </Button>

        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
