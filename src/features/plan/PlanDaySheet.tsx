"use client";

import { useEffect, useRef } from "react";
import { isoWeekday } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatLongDate, WEEKDAYS_LONG } from "@/lib/ui/tr";
import { splitDaySchedule } from "@/features/tasks/schedule";
import { TaskItem } from "@/features/tasks/TaskItem";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import type { Task } from "@/features/tasks/types";
import { ReorderButtons } from "./ReorderButtons";
import "@/components/sheet.css";

interface PlanDaySheetProps {
  date: DateStr;
  today: DateStr;
  tasks: readonly Task[];
  addPending: boolean;
  onClose: () => void;
  onAdd: (title: string, date: DateStr) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRename: (task: Task, title: string) => void;
  onSetTime: (
    task: Task,
    startTime: string | null,
    durationMinutes: number | null,
  ) => void;
  onUnschedule: (task: Task) => void;
  onReorder: (dayTasks: readonly Task[], task: Task, delta: -1 | 1) => void;
}

/**
 * Ay ölçeğinde bir günün görevleri.
 *
 * Ay ızgarasında hücreye sayı sığıyor ama satır sığmıyor; panel o
 * eksiği kapatır. `DayDetailSheet` (takvim) ile AYNI kabuğu paylaşır
 * (`sheet.css`) ama içeriği farklı: burada rutin ve günlük yok, sadece
 * görevler — plan ekranının işi zamanı işe bölmek, günü değerlendirmek
 * değil.
 *
 * Native `<dialog>`: odak tuzağı, Esc ve üst katman tarayıcıdan gelir.
 */
export function PlanDaySheet({
  date,
  today,
  tasks,
  addPending,
  onClose,
  onAdd,
  onToggle,
  onDelete,
  onRename,
  onSetTime,
  onUnschedule,
  onReorder,
}: PlanDaySheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const { timed, untimed } = splitDaySchedule(tasks);
  const ordered = [...timed, ...untimed];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        // Zemine tıklayınca kapat. `<dialog>` zemini kendisidir;
        // içerik sarmalayıcısına tıklama buraya ulaşmaz.
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="daySheet"
    >
      <div className="daySheetPanel">
        <header className="sticky top-0 z-[var(--z-sticky)] flex items-start gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="text-[length:var(--text-lg)] font-semibold tracking-[-0.01em]">
              {formatLongDate(date)}
            </h2>
            <p className="mt-0.5 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
              {WEEKDAYS_LONG[isoWeekday(date)]}
              {date === today && " · bugün"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Kapat"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink)]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="flex flex-col gap-3 px-4 py-4">
          {ordered.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {ordered.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  today={today}
                  onToggle={() => onToggle(task)}
                  onDelete={() => onDelete(task)}
                  onRename={(title) => onRename(task, title)}
                  onSetTime={(start, duration) => onSetTime(task, start, duration)}
                  onDefer={() => onUnschedule(task)}
                  extra={
                    ordered.length > 1 && !task.done ? (
                      <ReorderButtons
                        title={task.title}
                        isFirst={index === 0}
                        isLast={index === ordered.length - 1}
                        onMove={(delta) => onReorder(ordered, task, delta)}
                      />
                    ) : undefined
                  }
                />
              ))}
            </ul>
          )}

          <TaskQuickAdd
            dueDate={date}
            pending={addPending}
            onAdd={(title) => onAdd(title, date)}
          />
        </div>
      </div>
    </dialog>
  );
}
