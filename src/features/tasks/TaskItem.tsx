"use client";

import { memo, useState, type ReactNode } from "react";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatShortDate } from "@/lib/ui/tr";
import { isOverdue } from "./queries";
import { DURATION_PRESETS, formatDuration } from "./schedule";
import type { Task } from "./types";
import "@/components/list-motion.css";

interface TaskItemProps {
  task: Task;
  today: DateStr;
  onToggle: () => void;
  onDelete: () => void;
  /** Yarına ertele. Tarihsiz görevlerde gösterilmez. */
  onDefer?: () => void;
  /**
   * Saat/süre ayarlama. Verilmezse kontrol hiç gösterilmez —
   * tarihsiz görevlerin ("bir ara") saati olmaz.
   */
  onSetTime?: (startTime: string | null, durationMinutes: number | null) => void;
  /**
   * Saat çipini gizle. Gün planında saat zaten sol olukta yazıyor;
   * satırda tekrarlamak aynı bilgiyi iki kez göstermek olur.
   */
  hideTime?: boolean;
  /**
   * Gün seçici paneli. Verilirse "ertele" simgesi bir sonraki güne
   * itmek yerine bu paneli açar.
   *
   * Aynı simgenin iki anlam taşıması bilinçli: "yarına it" ve "bir
   * güne taşı" aynı hareketin iki hassasiyetidir. İkinci bir simge
   * eklemek, satırdaki eylem kümesini dörde çıkarır ve haftalık
   * ızgaranın dar sütununda yer kalmazdı.
   */
  dayPicker?: ReactNode;
}

export const TaskItem = memo(function TaskItem({
  task,
  today,
  onToggle,
  onDelete,
  onDefer,
  onSetTime,
  hideTime = false,
  dayPicker,
}: TaskItemProps) {
  const overdue = isOverdue(task, today);
  const [editingTime, setEditingTime] = useState(false);
  const [movingDay, setMovingDay] = useState(false);

  return (
    <li
      className={cn(
        "rowEnter revealOnHover flex items-center gap-3 rounded-xl border px-3 py-2.5",
        "transition-colors duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
        task.done
          ? "border-transparent bg-[var(--color-surface-2)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={task.done}
        aria-label={task.done ? `${task.title}: geri al` : `${task.title}: tamamla`}
        className="grid size-10 shrink-0 place-items-center rounded-lg transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
      >
        <span
          /* `key`: işaretlendiğinde eleman yeniden takılır ve onay
             animasyonu her seferinde yeniden oynar. Aksi halde CSS
             animasyonu yalnızca ilk boyamada çalışır. */
          key={task.done ? "done" : "todo"}
          className={cn(
            "grid size-[22px] place-items-center rounded-md transition-colors duration-[var(--duration-fast)]",
            task.done
              ? "markPop bg-[var(--color-ink-3)]"
              : "border-[1.5px] border-[var(--color-line-2)]",
          )}
        >
          {task.done && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M2.5 6.2l2.4 2.4L9.5 4"
                stroke="var(--color-surface)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "flex items-baseline gap-2 text-[length:var(--text-base)]",
            task.done && "text-[var(--color-ink-3)] line-through",
          )}
        >
          {!hideTime && task.startTime && (
            <span className="tabular shrink-0 text-[var(--color-ink-3)]">
              {task.startTime}
            </span>
          )}
          <span className="truncate">{task.title}</span>
          {!hideTime && task.durationMinutes && (
            <span className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
              {formatDuration(task.durationMinutes)}
            </span>
          )}
        </div>

        {editingTime && onSetTime && (
          <TimeEditor
            task={task}
            onClose={() => setEditingTime(false)}
            onSet={onSetTime}
          />
        )}

        {movingDay && dayPicker}

        {overdue && task.dueDate && (
          <div className="mt-0.5 text-[length:var(--text-xs)] text-[var(--color-warn)]">
            {formatShortDate(task.dueDate)} tarihinden taşındı
          </div>
        )}

        {task.note && !task.done && (
          <div className="mt-0.5 truncate text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {task.note}
          </div>
        )}
      </div>

      <div className="revealTarget flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-[var(--duration-fast)]">
        {onSetTime && !task.done && (
          <IconButton
            label={`${task.title}: saat ayarla`}
            onClick={() => setEditingTime((open) => !open)}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M8 4.75V8l2.25 1.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
        )}

        {(onDefer || dayPicker) && !task.done && (
          <IconButton
            label={
              dayPicker
                ? `${task.title}: başka güne taşı`
                : `${task.title}: yarına ertele`
            }
            onClick={
              dayPicker ? () => setMovingDay((open) => !open) : () => onDefer?.()
            }
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8h8M8 5l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M13.5 3.5v9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </IconButton>
        )}

        <IconButton label={`${task.title}: sil`} onClick={onDelete}>
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
    </li>
  );
});

/**
 * Saat ve süre ayarlama paneli.
 *
 * Görev eklerken DEĞİL, sonradan açılır: tek satırlık hızlı ekleme
 * "görev eklemek tek cümle yazmaktır" ilkesini korumalı. Saat, planı
 * kuran ikinci bir hareket olarak verilir.
 *
 * Süre ön ayarlardan seçilir; serbest dakika girişi bu ekranda
 * kimsenin ihtiyaç duymadığı bir hassasiyet olurdu.
 */
function TimeEditor({
  task,
  onClose,
  onSet,
}: {
  task: Task;
  onClose: () => void;
  onSet: (startTime: string | null, durationMinutes: number | null) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <input
        type="time"
        value={task.startTime ?? ""}
        aria-label="Başlangıç saati"
        onChange={(e) => onSet(e.target.value || null, task.durationMinutes)}
        className="tabular h-8 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface-2)] px-2 text-[length:var(--text-sm)] outline-none focus:border-[var(--color-accent)]"
      />

      {task.startTime &&
        DURATION_PRESETS.map((minutes) => (
          <button
            key={minutes}
            type="button"
            aria-pressed={task.durationMinutes === minutes}
            onClick={() =>
              onSet(
                task.startTime,
                task.durationMinutes === minutes ? null : minutes,
              )
            }
            className={cn(
              "h-8 rounded-md px-2 text-[length:var(--text-xs)]",
              "transition-colors duration-[var(--duration-fast)]",
              task.durationMinutes === minutes
                ? "bg-[color-mix(in_oklch,var(--color-accent)_18%,transparent)] text-[var(--color-ink)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
            )}
          >
            {formatDuration(minutes)}
          </button>
        ))}

      {task.startTime && (
        <button
          type="button"
          onClick={() => {
            onSet(null, null);
            onClose();
          }}
          className="h-8 rounded-md px-2 text-[length:var(--text-xs)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-danger)]"
        >
          Saati kaldır
        </button>
      )}
    </div>
  );
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
      className="grid size-8 place-items-center rounded-md text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-2)]"
    >
      {children}
    </button>
  );
}
