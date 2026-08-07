"use client";

import { memo } from "react";
import { formatShortDate } from "@/lib/ui/tr";
import { cn } from "@/lib/ui/cn";
import { MistakeImage } from "./MistakeImage";
import { GRADUATED_STAGE } from "./review";
import type { Mistake } from "./types";
import "@/components/list-motion.css";

interface MistakeItemProps {
  mistake: Mistake;
  onEdit: () => void;
  onDelete: () => void;
}

/** Listedeki tek yanlış kartı. */
export const MistakeItem = memo(function MistakeItem({
  mistake,
  onEdit,
  onDelete,
}: MistakeItemProps) {
  const heading = `${mistake.ders} · ${mistake.konu}`;

  return (
    <li
      className={cn(
        "rowEnter revealOnHover flex flex-col gap-2.5 rounded-xl border border-[var(--color-line)]",
        "bg-[var(--color-surface)] px-3.5 py-3",
        "transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-line-2)]",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[length:var(--text-base)] font-medium leading-snug">
            {heading}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            <span className="tabular">{formatShortDate(mistake.date)}</span>
            <ReviewBadge mistake={mistake} />
          </p>
        </div>

        <div className="revealTarget flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-[var(--duration-fast)]">
          <IconButton label={`${heading}: düzenle`} onClick={onEdit}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M11.2 2.8a1.6 1.6 0 0 1 2.3 2.3L5.6 13H3v-2.6z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>

          <IconButton label={`${heading}: sil`} onClick={onDelete}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3.5 4.5h9M6.5 4.5V3.2c0-.4.3-.7.7-.7h1.6c.4 0 .7.3.7.7v1.3M5 4.5l.5 8h5l.5-8"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
        </div>
      </div>

      {mistake.imagePath && (
        <MistakeImage
          path={mistake.imagePath}
          width={mistake.imageWidth}
          height={mistake.imageHeight}
          alt={`${heading} ekran görüntüsü`}
        />
      )}

      {mistake.note && (
        <p className="whitespace-pre-wrap text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
          {mistake.note}
        </p>
      )}
    </li>
  );
});

/**
 * Tekrar durumu rozeti.
 *
 * Mezun olmuş yanlış "tamamlandı" der; devam edenler kaçıncı tekrarda
 * olduklarını gösterir. Kullanıcı mezuniyete doğru ilerlemeyi
 * görebilmeli, aksi halde tekrar merdiveni görünmez bir mekanizma olur.
 */
function ReviewBadge({ mistake }: { mistake: Mistake }) {
  if (mistake.reviewStage >= GRADUATED_STAGE) {
    return <span className="text-[var(--color-good)]">· tekrarı bitti</span>;
  }
  if (mistake.reviewStage === 0) return null;
  return <span>· {mistake.reviewStage}. tekrar yapıldı</span>;
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-md text-[var(--color-ink-3)]",
        "transition-[color,background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
        "hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-2)] active:scale-[0.97]",
      )}
    >
      {children}
    </button>
  );
}
