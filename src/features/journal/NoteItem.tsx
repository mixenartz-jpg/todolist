"use client";

import { memo } from "react";
import { cn } from "@/lib/ui/cn";
import { displayTitle } from "./search";
import type { Note } from "./types";
import "@/components/list-motion.css";

interface NoteItemProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Defterdeki tek not satırı.
 *
 * Gövde kırpılmaz, tamamı gösterilir: not okumak için var, "devamını
 * gör" tıklaması bir notu okumakla arasına engel koyar. Uzun notlar
 * listeyi uzatır ama tarih başlıkları zaten tutamak sağlıyor.
 */
export const NoteItem = memo(function NoteItem({
  note,
  onEdit,
  onDelete,
}: NoteItemProps) {
  const heading = displayTitle(note);
  // Başlık gövdenin ilk satırından türetildiyse gövdeyi tekrar
  // yazdırmak aynı metni iki kez göstermek olur.
  const derived = !note.title?.trim();

  return (
    <li
      className={cn(
        "rowEnter revealOnHover flex flex-col gap-1.5 rounded-xl border border-[var(--color-line)]",
        "bg-[var(--color-surface)] px-3.5 py-3",
        "transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-line-2)]",
      )}
    >
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-[length:var(--text-base)] font-medium leading-snug">
          {heading}
        </h3>

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

      {!derived && (
        <p className="whitespace-pre-wrap text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
          {note.body}
        </p>
      )}

      {derived && hasMoreLines(note.body) && (
        <p className="whitespace-pre-wrap text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
          {restAfterFirstLine(note.body)}
        </p>
      )}
    </li>
  );
});

function hasMoreLines(body: string): boolean {
  return body.trim().includes("\n");
}

function restAfterFirstLine(body: string): string {
  const trimmed = body.trim();
  const breakAt = trimmed.indexOf("\n");
  return breakAt === -1 ? "" : trimmed.slice(breakAt + 1).trim();
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
