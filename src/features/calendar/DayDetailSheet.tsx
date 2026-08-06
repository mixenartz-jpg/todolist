"use client";

import { useEffect, useMemo, useRef } from "react";
import { isoWeekday } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatLongDate, formatPercent, WEEKDAYS_LONG } from "@/lib/ui/tr";
import { isCompleted, valueOn } from "@/features/entries/completion";
import { useSetEntry } from "@/features/entries/mutations";
import { EMPTY_ENTRIES, useEntries } from "@/features/entries/queries";
import { isActiveOn, isDueOn } from "@/features/routines/schedule";
import { useRoutines } from "@/features/routines/queries";
import type { RoutineWithSchedule } from "@/features/routines/types";
import { dayScore, periodProgress } from "@/features/stats/score";
import { DayNoteCard } from "@/features/notes/DayNoteCard";
import { TaskItem } from "@/features/tasks/TaskItem";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import {
  useCreateTask,
  useDeleteTask,
  useToggleTask,
} from "@/features/tasks/mutations";
import { tasksForDay, useTasks } from "@/features/tasks/queries";
import { TodayRoutineItem } from "@/features/today/TodayRoutineItem";

/**
 * Bir günün detayı — geçmiş bir günü doldurmak ya da gözden geçirmek
 * için.
 *
 * Native `<dialog>` kullanılır: odak tuzağı, Esc ile kapanma ve
 * üst katman yönetimi tarayıcıdan gelir; elle kurulan bir modal bunları
 * eksik yapardı.
 */
export function DayDetailSheet({
  date,
  today,
  onClose,
  onError,
}: {
  date: DateStr;
  today: DateStr;
  onClose: () => void;
  onError?: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const routinesQuery = useRoutines();
  const entriesQuery = useEntries(date, date);
  const tasksQuery = useTasks();

  const entries = entriesQuery.data ?? EMPTY_ENTRIES;
  const setEntry = useSetEntry(onError);
  const toggleTask = useToggleTask(onError);
  const createTask = useCreateTask(onError);
  const deleteTask = useDeleteTask(onError);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const routines = useMemo(() => {
    const all = routinesQuery.data ?? [];
    return all.filter((r) => {
      if (!isActiveOn(r, date)) return false;
      if (isDueOn(r, date)) return true;
      if (valueOn(entries, r, date) > 0) return true;
      return periodProgress(entries, r, date) !== null;
    });
  }, [routinesQuery.data, entries, date]);

  const score = useMemo(
    () => dayScore(entries, routinesQuery.data ?? [], date),
    [entries, routinesQuery.data, date],
  );

  const dayTasks = useMemo(
    () => tasksForDay(tasksQuery.data ?? [], date),
    [tasksQuery.data, date],
  );

  function handleToggle(routine: RoutineWithSchedule) {
    setEntry.mutate({
      routineId: routine.id,
      date,
      value: isCompleted(entries, routine, date) ? 0 : routine.target,
    });
  }

  function handleStep(routine: RoutineWithSchedule, delta: number) {
    const next = Math.max(0, valueOn(entries, routine, date) + delta);
    setEntry.mutate({ routineId: routine.id, date, value: next });
  }

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
              {score.possible > 0 && ` · ${formatPercent(score.ratio)}`}
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

        <div className="flex flex-col gap-6 px-4 py-4">
          {routines.length > 0 && (
            <section>
              <ul className="flex flex-col gap-2">
                {routines.map((routine) => (
                  <TodayRoutineItem
                    key={routine.id}
                    routine={routine}
                    date={date}
                    value={valueOn(entries, routine, date)}
                    completed={isCompleted(entries, routine, date)}
                    progress={periodProgress(entries, routine, date)}
                    onToggle={() => handleToggle(routine)}
                    onStep={(delta) => handleStep(routine, delta)}
                  />
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
              Görevler
            </h3>

            {dayTasks.length > 0 && (
              <ul className="mb-2 flex flex-col gap-1.5">
                {dayTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    today={today}
                    onToggle={() =>
                      toggleTask.mutate({ id: task.id, done: !task.done })
                    }
                    onDelete={() => deleteTask.mutate(task.id)}
                  />
                ))}
              </ul>
            )}

            <TaskQuickAdd
              dueDate={date}
              pending={createTask.isPending}
              onAdd={(title) => createTask.mutate({ title, dueDate: date, note: null })}
            />
          </section>

          <section>
            <h3 className="mb-2 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
              Günlük
            </h3>
            <DayNoteCard date={date} onError={onError} />
          </section>
        </div>
      </div>
    </dialog>
  );
}
