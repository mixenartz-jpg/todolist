"use client";

import { useState } from "react";
import { cn } from "@/lib/ui/cn";
import { DERS_MAX, KONU_MAX } from "./types";

interface RenameRowProps {
  /** Mevcut ad — kutuya ön dolgu olarak girer. */
  value: string;
  /** Ders mi konu mu; yalnızca uzunluk sınırını ve etiketi belirler. */
  level: "ders" | "konu";
  onSubmit: (next: string) => void;
  onCancel: () => void;
}

/**
 * Satır içi yeniden adlandırma kutusu.
 *
 * Ders ve konu için TEK bileşen: ikisi arasındaki fark tamamen plan
 * fonksiyonundadır (`rename.ts` — konu kendi dersiyle sınırlıdır),
 * arayüzde değil. İki ayrı bileşen yazmak aynı kutuyu iki kez
 * bakmak olurdu.
 *
 * Enter kaydeder, Esc vazgeçer. Blur KAYDETMEZ: `SectionHeading`'den
 * ayrılan yer burası. Orada yazma tek satırlık ve geri alınabilir bir
 * işlemdir; burada onay kutusu açılıp N kayıt güncelleniyor ve bunun
 * yanlışlıkla başka yere tıklamayla başlaması istenmez.
 */
export function RenameRow({ value, level, onSubmit, onCancel }: RenameRowProps) {
  const [next, setNext] = useState(value);
  const trimmed = next.trim();
  const unchanged = trimmed === value.trim();

  function submit() {
    if (trimmed.length === 0 || unchanged) {
      onCancel();
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <div className={cn("flex items-center gap-1.5 py-1.5", level === "konu" ? "pl-7 pr-3" : "px-2")}>
      <input
        autoFocus
        value={next}
        onChange={(e) => setNext(e.target.value)}
        maxLength={level === "ders" ? DERS_MAX : KONU_MAX}
        aria-label={level === "ders" ? "Ders adı" : "Konu adı"}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className={cn(
          "h-8 min-w-0 flex-1 rounded-md border border-[var(--color-accent)]",
          "bg-[var(--color-surface-2)] px-2 text-[length:var(--text-sm)] outline-none",
        )}
      />

      <button
        type="button"
        onClick={submit}
        disabled={trimmed.length === 0 || unchanged}
        className="h-8 shrink-0 rounded-md px-2.5 text-[length:var(--text-sm)] font-medium text-[var(--color-accent)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-2)] disabled:opacity-40"
      >
        Kaydet
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="h-8 shrink-0 rounded-md px-2.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-ink-2)]"
      >
        Vazgeç
      </button>
    </div>
  );
}

/** Satırın sağında beliren yeniden adlandırma düğmesi. */
export function RenameButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}: yeniden adlandır`}
      title="Yeniden adlandır"
      /*
       * `stopPropagation` ŞART DEĞİL ama zararsız: düğme artık
       * genişletici butonun KARDEŞİ, içinde değil. İç içe etkileşimli
       * öğe geçersiz HTML'dir ve klavye gezinmesini bozardı — satır
       * bu yüzden yeniden yapılandırıldı.
       */
      onClick={onClick}
      className="revealTarget grid size-7 shrink-0 place-items-center rounded-md text-[var(--color-ink-3)] opacity-0 transition-[opacity,color,background-color] duration-[var(--duration-fast)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-2)]"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
