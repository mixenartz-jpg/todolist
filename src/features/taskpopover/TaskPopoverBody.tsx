"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { DURATION_PRESETS, formatDuration } from "@/features/tasks/schedule";
import { normalizeTitleInput, shouldPersistTitle, TASK_TITLE_MAX } from "@/features/tasks/rename";
import type { Task } from "@/features/tasks/types";
import { normalizeNoteInput, shouldPersistNote, TASK_NOTE_MAX } from "./note";
import { TaskColorRow } from "./TaskColorRow";
import { TaskGoalRow } from "./TaskGoalRow";
import type { TaskPopoverActions } from "./useTaskPopoverActions";

interface TaskPopoverBodyProps {
  task: Task;
  /** Devralınacak kategori rengi — renk satırının önizlemesi için. */
  inheritedColor: number | null;
  actions: TaskPopoverActions;
  onClose: () => void;
}

/**
 * Popover içeriği: başlık, açıklama, saat, renk, eylemler.
 *
 * KABUKTAN AYRI (`TaskPopover`), çünkü aynı gövde iki farklı kabukta
 * yaşıyor: masaüstünde çapalı `fixed` panel, mobilde alttan yükselen
 * `<dialog>` sheet. Konumlandırma ve odak mantığı kabukta, düzenleme
 * mantığı burada.
 *
 * ── Kaydetme sözleşmesi ──
 * Metin alanlarında BLUR KAYDEDER. Bu `TitleEditor`'ın (TaskItem)
 * sözleşmesidir ve gerekçesi orada yazılı: düzenlenen şey zaten var
 * olan bir kayıttır, en kötü ihtimalle bir alanı değişir ve geri
 * alınabilir. `DraftPrompt`'un (DayGridScreen) "blur iptal eder"
 * kuralı buraya UYMAZ — orada blur yeni bir kayıt YARATIRDI.
 *
 * Saat, süre ve renk ANINDA yazılır: bunlar metin değil, seçim. Bir
 * seçimi "onaylamak" için ikinci bir harekete gerek yok ve hepsi
 * optimistic, yani yanlış seçim tek tıkla geri alınır.
 */
export function TaskPopoverBody({
  task,
  inheritedColor,
  actions,
  onClose,
}: TaskPopoverBodyProps) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <TitleField task={task} actions={actions} />
      <NoteField task={task} actions={actions} />

      <TimeFields task={task} actions={actions} />

      <TaskColorRow
        value={task.colorSlot}
        inherited={inheritedColor}
        onChange={(slot) => actions.onSetColor(task, slot)}
      />

      {/* Aylık hedef bağı. Renkten SONRA, eylemlerden ÖNCE: renk gibi
          bir "seçim" satırı (anında yazılır) ama eylemler kadar sık
          kullanılmaz. O ayda hedef yoksa hiç çizilmez. */}
      <TaskGoalRow
        task={task}
        onChange={(goalId) => actions.onSetGoal(task, goalId)}
      />

      <ActionRow task={task} actions={actions} onClose={onClose} />
    </div>
  );
}

/**
 * Başlık alanı.
 *
 * `TitleEditor`'ın `cancelledRef` deseni burada da tekrarlanıyor ve
 * sebebi aynı: Escape'te React alanı sökerken tarayıcı YİNE bir `blur`
 * gönderir. Bayrak olmadan "iptal ettim" denen düzenleme blur yolundan
 * kaydedilirdi.
 */
function TitleField({
  task,
  actions,
}: {
  task: Task;
  actions: TaskPopoverActions;
}) {
  const [value, setValue] = useState(task.title);
  const cancelled = useRef(false);

  function commit() {
    if (cancelled.current) return;
    const next = normalizeTitleInput(value);
    if (shouldPersistTitle(task.title, next) && next !== null) {
      actions.onRename(task, next);
    }
  }

  return (
    <input
      autoFocus
      maxLength={TASK_TITLE_MAX}
      value={value}
      aria-label="Görev adı"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          // Popover'a SIZDIRMA: Escape önce alanı iptal eder, paneli
          // kapatmaz. İkinci Escape (alan odakta değilken) kapatır.
          e.stopPropagation();
          cancelled.current = true;
          setValue(task.title);
          e.currentTarget.blur();
          // Bayrak bir sonraki düzenleme için temizlenir.
          queueMicrotask(() => {
            cancelled.current = false;
          });
        }
      }}
      className={cn(
        "w-full rounded-md bg-[var(--color-surface-2)] px-2 py-1.5",
        "text-[length:var(--text-sm)] text-[var(--color-ink)] outline-none",
        "ring-1 ring-[var(--color-line-2)] focus:ring-[var(--color-accent)]",
      )}
    />
  );
}

/**
 * Açıklama alanı.
 *
 * Enter SATIR SONUDUR, kaydetme değil — çok satırlı bir alanda Enter'ı
 * kaydetmeye bağlamak, kullanıcının ikinci satırı yazmasını imkânsız
 * kılardı. `Ctrl+Enter` gibi bir kısayol eklenebilirdi ama o gizli bir
 * yoldur; blur zaten kaydediyor ve panelin her yerine tıklamak blur
 * üretir.
 */
function NoteField({
  task,
  actions,
}: {
  task: Task;
  actions: TaskPopoverActions;
}) {
  const [value, setValue] = useState(task.note ?? "");
  const cancelled = useRef(false);

  function commit() {
    if (cancelled.current) return;
    const next = normalizeNoteInput(value);
    if (shouldPersistNote(task.note, next)) {
      // `shouldPersistNote` `undefined`'ı zaten eledi; kalan iki durum
      // (`string` ve `null`) da geçerli birer yazma emri.
      actions.onSetNote(task, next ?? null);
    }
  }

  return (
    <textarea
      rows={3}
      maxLength={TASK_NOTE_MAX}
      value={value}
      placeholder="Açıklama ekle…"
      aria-label="Açıklama"
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
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
        "w-full resize-y rounded-md bg-[var(--color-surface-2)] px-2 py-1.5",
        "text-[length:var(--text-xs)] leading-relaxed text-[var(--color-ink-2)] outline-none",
        "ring-1 ring-[var(--color-line-2)] focus:ring-[var(--color-accent)]",
        "placeholder:text-[var(--color-ink-4)]",
      )}
    />
  );
}

/**
 * Saat ve süre.
 *
 * `TimeEditor`'ın (TaskItem) mantığı taşındı, düzeni değil: orası bir
 * liste satırının altına açılan yatay şeritti, burası panelin bir
 * bölümü. Süre ön ayarlardan seçilir — serbest dakika girişi bu
 * ekranda kimsenin ihtiyaç duymadığı bir hassasiyet olurdu.
 */
function TimeFields({
  task,
  actions,
}: {
  task: Task;
  actions: TaskPopoverActions;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <input
          type="time"
          value={task.startTime ?? ""}
          aria-label="Başlangıç saati"
          onChange={(e) =>
            actions.onSetTime(task, e.target.value || null, task.durationMinutes)
          }
          className="tabular h-8 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface-2)] px-2 text-[length:var(--text-sm)] outline-none focus:border-[var(--color-line-3)]"
        />

        {task.startTime && (
          <button
            type="button"
            onClick={() => actions.onSetTime(task, null, null)}
            className="h-8 rounded-md px-2 text-[length:var(--text-xs)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-danger)]"
          >
            Saati kaldır
          </button>
        )}
      </div>

      {/* Süre yalnızca saat VARKEN anlamlı — DB kısıtı da bunu söylüyor
          (0006: duration_minutes null değilse start_time da dolu). */}
      {task.startTime && (
        <div className="flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              aria-pressed={task.durationMinutes === minutes}
              onClick={() =>
                actions.onSetTime(
                  task,
                  task.startTime,
                  // Seçili olana tekrar basmak süreyi KALDIRIR: açık bir
                  // "süre yok" düğmesi eklemeden geri dönüş yolu.
                  task.durationMinutes === minutes ? null : minutes,
                )
              }
              className={cn(
                "h-7 rounded-md px-2 text-[length:var(--text-xs)]",
                "transition-colors duration-[var(--duration-fast)]",
                task.durationMinutes === minutes
                  ? "bg-[color-mix(in_oklch,var(--color-accent)_18%,transparent)] text-[var(--color-ink)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
              )}
            >
              {formatDuration(minutes)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Alt eylem satırı: tamamla / ertele / sil.
 *
 * Silme paneli KAPATIR: silinen görevin düzenleme paneli açık kalsaydı
 * artık var olmayan bir kaydı düzenliyor olurdu. Tamamlama ve erteleme
 * kapatmaz — ikisi de görevi yaşatır ve kullanıcı aynı panelde başka
 * bir şeye devam edebilir.
 */
function ActionRow({
  task,
  actions,
  onClose,
}: {
  task: Task;
  actions: TaskPopoverActions;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 border-t border-[var(--color-line)] pt-2.5">
      <button
        type="button"
        onClick={() => actions.onToggle(task)}
        className={cn(
          "h-8 flex-1 rounded-md text-[length:var(--text-xs)]",
          "transition-colors duration-[var(--duration-fast)]",
          task.done
            ? "bg-[var(--color-surface-3)] text-[var(--color-ink-2)]"
            : "bg-[color-mix(in_oklch,var(--color-good)_20%,transparent)] text-[var(--color-ink)]",
        )}
      >
        {task.done ? "Geri al" : "Tamamla"}
      </button>

      <button
        type="button"
        onClick={() => actions.onDefer(task)}
        className="h-8 rounded-md bg-[var(--color-surface-2)] px-2.5 text-[length:var(--text-xs)] text-[var(--color-ink-2)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-3)]"
      >
        Yarına
      </button>

      <button
        type="button"
        aria-label="Görevi sil"
        onClick={() => {
          actions.onDelete(task);
          onClose();
        }}
        className="h-8 rounded-md bg-[var(--color-surface-2)] px-2.5 text-[length:var(--text-xs)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:bg-[color-mix(in_oklch,var(--color-danger)_20%,transparent)] hover:text-[var(--color-ink)]"
      >
        Sil
      </button>
    </div>
  );
}
