"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { normalizeNoteInput, shouldPersistNote, TASK_NOTE_MAX } from "./note";
import { TaskColorRow } from "./TaskColorRow";
import { TaskGoalRow } from "./TaskGoalRow";
import type { Task } from "./types";

/**
 * Görev satırının açılır bölmesi: hedef, renk, açıklama.
 *
 * ── `TaskPopover`'ın yerini aldı ──
 * Eski panel ızgaradaki bloğun yanına çapalanıyordu: dört kenarı
 * deneyen bir konumlandırma modülü (`anchor.ts`), portal, `fixed`
 * konum, masaüstü/mobil için iki ayrı kabuk ve dışarı tıklamayı
 * yakalayan bir dinleyici. Bloklar saat ızgarasıyla birlikte gidince
 * çapalanacak bir şey de kalmadı — bölme satırın ALTINA indi ve o
 * makinenin tamamı düştü.
 *
 * Kaybolmayan üç şey: hedef bağı, renk ve açıklama. Üçü de görevin
 * KENDİ alanları ve tek görünür düzenleme yolları burasıydı; panelle
 * birlikte silinselerdi şemada var olup arayüzde erişilemeyen üç alan
 * kalırdı (`goal_id` bunu bir kez zaten yaşadı — bkz. TaskGoalRow).
 *
 * ── Kaydetme sözleşmesi ──
 * Açıklamada BLUR KAYDEDER, Esc geri alır. Ayrı bir "kaydet" düğmesi
 * yok: bölmenin her yerine tıklamak zaten blur üretir ve düğme,
 * kullanıcıya kaydetmeyi UNUTABİLECEĞİ bir durum yaratırdı.
 */
export function TaskDetails({
  task,
  /** Devralınacak kategori rengi — renk satırının önizlemesi için. */
  inheritedColor,
  onSetGoal,
  onSetColor,
  onSetNote,
}: {
  task: Task;
  inheritedColor: number | null;
  onSetGoal: (goalId: string | null) => void;
  onSetColor: (colorSlot: number | null) => void;
  onSetNote: (note: string | null) => void;
}) {
  return (
    /* Bölme satırın İÇİNDE ama kendi zeminiyle ayrılıyor: aynı zeminde
       olsaydı satırın kendi kontrolleriyle bölmenin kontrolleri tek bir
       küme gibi okunurdu. */
    <div className="flex flex-col gap-3 rounded-lg bg-[var(--color-surface-2)] p-3">
      <TaskGoalRow task={task} onChange={onSetGoal} />

      <TaskColorRow
        value={task.colorSlot}
        inherited={inheritedColor}
        onChange={onSetColor}
      />

      <NoteField task={task} onSetNote={onSetNote} />
    </div>
  );
}

/**
 * Açıklama alanı.
 *
 * Enter SATIR SONUDUR, kaydetme değil — çok satırlı bir alanda Enter'ı
 * kaydetmeye bağlamak, kullanıcının ikinci satırı yazmasını imkânsız
 * kılardı. `Ctrl+Enter` gibi bir kısayol eklenebilirdi ama o gizli bir
 * yoldur; blur zaten kaydediyor.
 */
function NoteField({
  task,
  onSetNote,
}: {
  task: Task;
  onSetNote: (note: string | null) => void;
}) {
  const [value, setValue] = useState(task.note ?? "");
  const cancelled = useRef(false);

  function commit() {
    if (cancelled.current) return;
    const next = normalizeNoteInput(value);
    if (shouldPersistNote(task.note, next)) {
      // `shouldPersistNote` `undefined`'ı zaten eledi; kalan iki durum
      // (`string` ve `null`) da geçerli birer yazma emri.
      onSetNote(next ?? null);
    }
  }

  return (
    <textarea
      rows={3}
      maxLength={TASK_NOTE_MAX}
      value={value}
      placeholder="Açıklama ekle…"
      aria-label={`${task.title}: açıklama`}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          /*
           * `stopPropagation`: Esc bölmeyi de kapatabilir ve o zaman
           * metin alanı DOM'dan sökülürken tarayıcı yine de bir blur
           * gönderirdi — iptal etmesi gereken yazıyı kaydederek.
           * Bayrak + durdurma bu sırayı kırıyor (aynı gerekçe
           * `TitleEditor`'da).
           */
          e.stopPropagation();
          cancelled.current = true;
          setValue(task.note ?? "");
          e.currentTarget.blur();
          queueMicrotask(() => {
            cancelled.current = false;
          });
        }
      }}
      className={cn(
        "w-full resize-y rounded-md bg-[var(--color-surface)] px-2 py-1.5",
        "text-[length:var(--text-xs)] leading-relaxed text-[var(--color-ink-2)] outline-none",
        "ring-1 ring-[var(--color-line-2)] focus:ring-[var(--color-accent)]",
        "placeholder:text-[var(--color-ink-4)]",
      )}
    />
  );
}
