"use client";

import { memo } from "react";
import { cn } from "@/lib/ui/cn";
import { Chevron } from "@/components/Chevron";
import { displayTitle, noteBody } from "./search";
import type { Note } from "./types";
import "@/components/list-motion.css";

interface NoteItemProps {
  note: Note;
  /** Gövde görünür mü. Varsayılan KAPALI — bkz. aşağıdaki gerekçe. */
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Arama açıkken ok gizlenir: not zorla açık olduğu için iş yapmaz. */
  toggleHidden?: boolean;
}

/**
 * Defterdeki tek not satırı.
 *
 * ── Gövde varsayılan olarak KAPALI ──
 * Önceki sürüm gövdeyi hiç kırpmıyordu; gerekçe "not okumak için var,
 * bir tıklama araya engel koyar" idi. Not sayısı arttıkça bu tersine
 * döndü: 10.000 karaktere kadar çıkabilen gövdelerle liste taranamaz
 * hâle geldi ve tarih başlıkları tek başına tutamak olmaya yetmedi.
 * Defter bir okuma değil ARŞİV yüzeyi — aranan notu bulmak, bulunanı
 * okumaktan daha sık yapılan iş.
 *
 * Kapatmak bilgi saklamaz, dizin üretir: başlık zaten notun ne olduğunu
 * söylüyor (bkz. `displayTitle`) ve ok tek tıklamayla gövdeyi veriyor.
 *
 * ── Açılacak şeyi olmayan notta ok YOK ──
 * Başlık gövdenin ilk satırından türetildiyse ve not tek satırsa geriye
 * gösterilecek metin kalmaz (bkz. `noteBody`). Oraya da ok koymak, bası
 * hiçbir şey yapmayan bir düğme demekti — ok olmamasından kötü.
 */
export const NoteItem = memo(function NoteItem({
  note,
  open,
  onToggle,
  onEdit,
  onDelete,
  toggleHidden = false,
}: NoteItemProps) {
  const heading = displayTitle(note);
  const body = noteBody(note);
  const collapsible = body.length > 0;

  return (
    <li
      className={cn(
        "rowEnter revealOnHover flex flex-col gap-1.5 rounded-xl border border-[var(--color-line)]",
        "bg-[var(--color-surface)] px-3.5 py-3",
        "transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-line-2)]",
      )}
    >
      <div className="flex items-start gap-2">
        {/*
          Başlık DIŞTA, düğme içte: `<h3>` semantiği korunur ve ekran
          okuyucu başlık listesinde notu bulmaya devam eder. Ters sıra
          (`<button><h3>`) başlığı gezinmeden düşürürdü.
        */}
        <h3 className="min-w-0 flex-1 text-[length:var(--text-base)] font-medium leading-snug">
          {collapsible && !toggleHidden ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              className={cn(
                "flex w-full items-start gap-2 rounded-sm text-left",
                "transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-ink-2)]",
              )}
            >
              {/* Ok ilk satırın ORTASINA hizalanır: başlık iki satıra
                  sardığında bloğun ortasına kaymaz. */}
              <span className="mt-[0.45em] flex">
                <Chevron open={open} />
              </span>
              <span className="min-w-0 flex-1">{heading}</span>
              <span className="sr-only">{open ? "Notu kapat" : "Notu aç"}</span>
            </button>
          ) : (
            /* Ok yokken de aynı girinti: satırlar hizada kalır. */
            <span className="flex items-start gap-2">
              <span className="mt-[0.45em] size-2.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{heading}</span>
            </span>
          )}
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

      {/* Gövdenin girintisi başlığın metniyle hizalanır, okun altına
          düşmez: ok 10px + 8px boşluk. */}
      {collapsible && open && (
        <p className="whitespace-pre-wrap pl-[1.125rem] text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
          {body}
        </p>
      )}
    </li>
  );
});

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
