"use client";

import { useEffect, useRef } from "react";
import { isoWeekday } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatLongDate, WEEKDAYS_LONG } from "@/lib/ui/tr";
import { splitDaySchedule } from "@/features/tasks/schedule";
import { TaskItem } from "@/features/tasks/TaskItem";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import type { Task } from "@/features/tasks/types";
import { CategoryDot } from "./CategoryDot";
import { DayPlanEditor } from "./DayPlanEditor";
import { CategoryPicker } from "./CategoryPicker";
import { GoalPicker } from "./GoalPicker";
import { ReorderButtons } from "./ReorderButtons";
import type { Category, PlanGoal } from "./types";
import "@/components/sheet.css";

interface PlanDaySheetProps {
  date: DateStr;
  today: DateStr;
  tasks: readonly Task[];
  categories: readonly Category[];
  /** Görüntülenen ayın hedefleri — görev satırındaki seçici için. */
  goals: readonly PlanGoal[];
  addPending: boolean;
  onError?: (message: string) => void;
  onSetCategory: (task: Task, categoryId: string | null) => void;
  onSetGoal: (task: Task, goalId: string | null) => void;
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
  categories,
  goals,
  addPending,
  onError,
  onSetCategory,
  onSetGoal,
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

  const categoryById = new Map(categories.map((c) => [c.id, c]));

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

        <div className="flex flex-col gap-4 px-4 py-4">
          {/*
           * Plan, görev listesinin ÜSTÜNDE: gün panelini açan hareket
           * "bu güne bakayım"dır ve önce günün niyeti okunur, sonra
           * işlerin dökümü. Altta olsaydı uzun bir listede hiç
           * görünmezdi.
           */}
          <DayPlanEditor date={date} onError={onError} />

          {ordered.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {ordered.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  today={today}
                  marker={
                    task.categoryId !== null &&
                    categoryById.has(task.categoryId) ? (
                      <CategoryDot
                        category={categoryById.get(task.categoryId)!}
                      />
                    ) : undefined
                  }
                  onToggle={() => onToggle(task)}
                  onDelete={() => onDelete(task)}
                  onRename={(title) => onRename(task, title)}
                  onSetTime={(start, duration) => onSetTime(task, start, duration)}
                  onDefer={() => onUnschedule(task)}
                  /*
                   * Kategori seçici ve sıra düğmeleri aynı yuvayı
                   * paylaşır. Seçici TAMAMLANMIŞ görevde de durur:
                   * bitmiş bir işin kategorisini düzeltmek ay
                   * dağılımını düzeltmenin tek yoludur. Sıra düğmeleri
                   * ise yalnızca açık işlerde anlamlı.
                   */
                  extra={
                    <div className="flex items-center gap-1.5">
                      <CategoryPicker
                        categories={categories}
                        value={task.categoryId}
                        taskTitle={task.title}
                        onChange={(categoryId) => onSetCategory(task, categoryId)}
                      />

                      <GoalPicker
                        goals={goals}
                        value={task.goalId}
                        taskTitle={task.title}
                        onChange={(goalId) => onSetGoal(task, goalId)}
                      />

                      {ordered.length > 1 && !task.done && (
                        <ReorderButtons
                          title={task.title}
                          isFirst={index === 0}
                          isLast={index === ordered.length - 1}
                          onMove={(delta) => onReorder(ordered, task, delta)}
                        />
                      )}
                    </div>
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
