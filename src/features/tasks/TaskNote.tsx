"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { normalizeNoteInput, shouldPersistNote, TASK_NOTE_MAX } from "./note";
import type { Task } from "./types";

/**
 * Görev satırındaki açıklama: okuma, yerinde düzenleme ve ekleme.
 *
 * ── Neden satırın KENDİSİNDE, açılır bölmede değil? ──
 * Açıklama eskiden yalnızca nişan simgesinin ("hedef ve ayarlar")
 * arkasındaki bölmeden yazılabiliyordu ve tek satıra kırpılıyordu:
 * hem bulunmuyordu hem de yazılan okunmuyordu. Artık metnin kendisi
 * hedef — başlıktaki `TitleEditor` ile aynı dil: dokun, yerinde yaz.
 *
 * ── İki satır önizleme ──
 * Tamamı her zaman açık olsaydı uzun bir açıklama listeyi şişirirdi;
 * tek satır ise çoğu açıklamayı yarım cümlede kesiyordu. İki satır
 * okunur ama yer kaplamaz; tamamı düzenleme kutusunda görünür.
 *
 * ── Bitmiş görevde ──
 * Başlıkla aynı kural: soluk, üstü çizili ve DÜZENLENMEZ. Kutucuğu
 * geri almaya çalışan el yanlış yere düşmemeli. Bitmiş işin notu
 * Arşiv'de ("ne yaptın?") yazılmaya devam ediyor.
 */
export function TaskNote({
  task,
  editing,
  onEditingChange,
  onSetNote,
  offerAdd,
}: {
  task: Task;
  /** Durum SATIRDA: düzenlerken satırın sürüklenmesi kapanmalı. */
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  /** Verilmezse açıklama salt okunur. */
  onSetNote?: (note: string | null) => void;
  /** Notsuz açık görevde "+ açıklama ekle" düğmesi çizilsin mi? */
  offerAdd: boolean;
}) {
  const canEdit = Boolean(onSetNote) && !task.done;

  if (editing && canEdit && onSetNote) {
    return (
      <NoteEditor
        task={task}
        onClose={() => onEditingChange(false)}
        onSetNote={onSetNote}
      />
    );
  }

  if (task.note) {
    /*
     * `whitespace-pre-line`: kullanıcının yazdığı satır sonları
     * korunur. `line-clamp-2` sınırı yine de iki görsel satır —
     * dört kısa satırlık bir liste de önizlemede iki satır kaplar.
     */
    const text = cn(
      "line-clamp-2 whitespace-pre-line break-words",
      "text-[length:var(--text-xs)] leading-relaxed",
      task.done
        ? "text-[var(--color-ink-4)] line-through"
        : "text-[var(--color-ink-3)]",
    );

    return canEdit ? (
      <button
        type="button"
        title="Açıklamayı düzenle"
        aria-label={`${task.title}: açıklamayı düzenle`}
        onClick={() => onEditingChange(true)}
        className={cn(
          "mt-0.5 -mx-1 block w-[calc(100%+0.5rem)] cursor-text rounded-sm px-1 py-0.5 text-left",
          "transition-colors duration-[var(--duration-fast)]",
          "hover:bg-[var(--color-surface-2)]",
        )}
      >
        <span className={text}>{task.note}</span>
      </button>
    ) : (
      <p className={cn("mt-0.5", text)}>{task.note}</p>
    );
  }

  if (offerAdd && canEdit) {
    return (
      <button
        type="button"
        onClick={() => onEditingChange(true)}
        className={cn(
          "mt-1 -mx-1 flex items-center gap-1 rounded-sm px-1 py-0.5",
          "text-[length:var(--text-xs)] text-[var(--color-ink-3)]",
          "transition-colors duration-[var(--duration-fast)]",
          "hover:text-[var(--color-accent)]",
        )}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M3 4.5h10M3 8h10M3 11.5h6"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        Açıklama ekle
      </button>
    );
  }

  return null;
}

/**
 * Açıklama düzenleme kutusu.
 *
 * Sözleşme Arşiv'in not alanıyla AYNI: blur kaydeder, Esc geri alır.
 * Enter SATIR SONUDUR — çok satırlı bir alanda Enter'ı kaydetmeye
 * bağlamak ikinci satırı yazmayı imkânsız kılardı.
 */
function NoteEditor({
  task,
  onClose,
  onSetNote,
}: {
  task: Task;
  onClose: () => void;
  onSetNote: (note: string | null) => void;
}) {
  const [value, setValue] = useState(task.note ?? "");
  const cancelled = useRef(false);

  function commit() {
    onClose();
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }

    const next = normalizeNoteInput(value);
    // `shouldPersistNote` `undefined`'ı eledi; kalan `string` ve `null`
    // ikisi de geçerli birer yazma emri.
    if (shouldPersistNote(task.note, next)) onSetNote(next ?? null);
  }

  return (
    <textarea
      autoFocus
      rows={3}
      maxLength={TASK_NOTE_MAX}
      value={value}
      placeholder="Açıklama ekle…"
      aria-label={`${task.title}: açıklama`}
      /* İmleç metnin SONUNDA açılır: var olan açıklamaya devam etmek,
         baştan yazmaktan çok daha sık. */
      onFocus={(e) => {
        const end = e.currentTarget.value.length;
        e.currentTarget.setSelectionRange(end, end);
      }}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          /*
           * Bayrak + blur: `onClose()` odağı eşzamanlı bırakmıyor ve
           * React alanı sökerken tarayıcı yine bir blur gönderiyor —
           * yani Esc, tam da iptal etmesi gereken yazıyı kaydederdi
           * (aynı gerekçe `TitleEditor`'da). `stopPropagation`: Esc
           * çevredeki paneli (gün paneli) de kapatmasın.
           */
          e.preventDefault();
          e.stopPropagation();
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "mt-1 w-full resize-y rounded-md bg-[var(--color-surface-2)] px-2 py-1.5",
        "text-[length:var(--text-xs)] leading-relaxed text-[var(--color-ink-2)] outline-none",
        "ring-1 ring-[var(--color-line-2)] focus:ring-[var(--color-accent)]",
        "placeholder:text-[var(--color-ink-4)]",
      )}
    />
  );
}
