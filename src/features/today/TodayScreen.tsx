"use client";

import { useMemo } from "react";
import { addDays, todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatLongDate, formatPercent, WEEKDAYS_LONG } from "@/lib/ui/tr";
import { isoWeekday } from "@/lib/date/date";
import { EmptyState } from "@/components/EmptyState";
import { CheckIcon } from "@/components/icons";
import { Toast, useToast } from "@/components/Toast";
import { isCompleted, valueOn } from "@/features/entries/completion";
import { useSetEntry } from "@/features/entries/mutations";
import { EMPTY_ENTRIES, useEntries } from "@/features/entries/queries";
import { isActiveOn, isDueOn } from "@/features/routines/schedule";
import { useRoutines } from "@/features/routines/queries";
import type { RoutineWithSchedule } from "@/features/routines/types";
import { dayScore, periodProgress } from "@/features/stats/score";
import { DayNoteCard } from "@/features/notes/DayNoteCard";
import { ReviewQueue } from "@/features/mistakes/ReviewQueue";
import { DaySchedule } from "@/features/tasks/DaySchedule";
import { TaskItem } from "@/features/tasks/TaskItem";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import {
  useCreateTask,
  useDeleteTask,
  useRescheduleTask,
  useSetTaskTime,
  useToggleTask,
} from "@/features/tasks/mutations";
import { tasksForDay, undatedTasks, useTasks } from "@/features/tasks/queries";
import { TodayRoutineItem } from "./TodayRoutineItem";

export function TodayScreen() {
  const today = useMemo(() => todayStr(), []);
  const toast = useToast();

  const routinesQuery = useRoutines();
  const entriesQuery = useEntries(today, today);
  const tasksQuery = useTasks();

  const entries = entriesQuery.data ?? EMPTY_ENTRIES;
  const setEntry = useSetEntry(toast.show);

  const toggleTask = useToggleTask(toast.show);
  const createTask = useCreateTask(toast.show);
  const deleteTask = useDeleteTask(toast.show);
  const rescheduleTask = useRescheduleTask(toast.show);
  const setTaskTime = useSetTaskTime(toast.show);

  /**
   * Bugün gösterilecek rutinler.
   *
   * Zorunlu olanlar + esnek olanlar (herhangi bir gün yapılabilir) +
   * bugün zaten işaretlenmiş olanlar. Sonuncusu önemli: zorunlu
   * olmayan bir günde bir şey yaptıysan listeden kaybolmamalı.
   */
  const routines = useMemo(() => {
    const all = routinesQuery.data ?? [];
    return all.filter((r) => {
      if (!isActiveOn(r, today)) return false;
      if (isDueOn(r, today)) return true;
      if (valueOn(entries, r, today) > 0) return true;
      return periodProgress(entries, r, today) !== null;
    });
  }, [routinesQuery.data, entries, today]);

  const score = useMemo(
    () => dayScore(entries, routinesQuery.data ?? [], today),
    [entries, routinesQuery.data, today],
  );

  const dayTasks = useMemo(
    () => tasksForDay(tasksQuery.data ?? [], today),
    [tasksQuery.data, today],
  );

  const someday = useMemo(
    () => undatedTasks(tasksQuery.data ?? []),
    [tasksQuery.data],
  );

  const doneCount = routines.filter((r) => isCompleted(entries, r, today)).length;

  function handleToggle(routine: RoutineWithSchedule) {
    setEntry.mutate({
      routineId: routine.id,
      date: today,
      value: isCompleted(entries, routine, today) ? 0 : routine.target,
    });
  }

  function handleStep(routine: RoutineWithSchedule, delta: number) {
    const next = Math.max(0, valueOn(entries, routine, today) + delta);
    setEntry.mutate({ routineId: routine.id, date: today, value: next });
  }

  const isLoading = routinesQuery.isPending;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TodayHeader
        date={today}
        doneCount={doneCount}
        totalCount={routines.length}
        ratio={score.ratio}
        hasWork={score.possible > 0}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-7 px-4 py-5 md:px-6">
        {isLoading ? (
          <TodaySkeleton />
        ) : (
          <>
            <section>
              {routines.length === 0 ? (
                <EmptyState
                  icon={<CheckIcon size={22} />}
                  title="Bugün için rutin yok"
                  description="Bugüne denk gelen bir rutinin yok. Yeni bir tane ekleyebilir ya da tablodan geçmiş günleri doldurabilirsin."
                  actionLabel="Rutin ekle"
                  actionHref="/rutinler"
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {routines.map((routine) => (
                    <TodayRoutineItem
                      key={routine.id}
                      routine={routine}
                      date={today}
                      value={valueOn(entries, routine, today)}
                      completed={isCompleted(entries, routine, today)}
                      progress={periodProgress(entries, routine, today)}
                      onToggle={() => handleToggle(routine)}
                      onStep={(delta) => handleStep(routine, delta)}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-2.5 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
                Görevler
              </h2>

              {dayTasks.length > 0 && (
                <div className="mb-2.5">
                  <DaySchedule
                    tasks={dayTasks}
                    today={today}
                    onToggle={(task) =>
                      toggleTask.mutate({ id: task.id, done: !task.done })
                    }
                    onDelete={(task) => deleteTask.mutate(task.id)}
                    onDefer={(task) =>
                      rescheduleTask.mutate({
                        id: task.id,
                        dueDate: addDays(today, 1),
                      })
                    }
                    onSetTime={(task, startTime, durationMinutes) =>
                      setTaskTime.mutate({ id: task.id, startTime, durationMinutes })
                    }
                  />
                </div>
              )}

              <TaskQuickAdd
                dueDate={today}
                pending={createTask.isPending}
                onAdd={(title) =>
                  createTask.mutate({ title, dueDate: today, note: null })
                }
              />
            </section>

            {/* Vadesi gelmiş yanlış tekrarları. Görevlerden SONRA:
                rutinler ve görevler günün asıl yükümlülükleri, tekrar
                ikincildir. Vadesi gelen yoksa bölüm hiçbir şey
                render etmez — bkz. ReviewQueue. */}
            <ReviewQueue today={today} onError={toast.show} />

            {/* Tarihsiz görevler ("bir ara yapılacak"). Katlanabilir:
                günlük akışın parçası değil, ama girildikleri yerde
                görünmezlerse kaybolmuş sayılırlar. */}
            {someday.length > 0 && (
              <details className="group">
                <summary className="mb-2.5 flex cursor-pointer list-none items-center gap-1.5 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden
                    className="transition-transform duration-[var(--duration-fast)] group-open:rotate-90"
                  >
                    <path
                      d="M4.5 2.5L8 6l-3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Bir ara
                  <span className="tabular text-[var(--color-ink-3)]">
                    {someday.filter((t) => !t.done).length}
                  </span>
                </summary>

                <ul className="flex flex-col gap-1.5">
                  {someday.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      today={today}
                      onToggle={() =>
                        toggleTask.mutate({ id: task.id, done: !task.done })
                      }
                      onDelete={() => deleteTask.mutate(task.id)}
                      onDefer={() =>
                        rescheduleTask.mutate({ id: task.id, dueDate: today })
                      }
                    />
                  ))}
                </ul>
              </details>
            )}

            <section>
              <h2 className="mb-2.5 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
                Günlük
              </h2>
              <DayNoteCard date={today} onError={toast.show} />
            </section>
          </>
        )}
      </div>

      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </div>
  );
}

function TodayHeader({
  date,
  doneCount,
  totalCount,
  ratio,
  hasWork,
}: {
  date: DateStr;
  doneCount: number;
  totalCount: number;
  ratio: number;
  hasWork: boolean;
}) {
  return (
    <header className="border-b border-[var(--color-line)] px-4 py-4 md:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
            {formatLongDate(date)}
          </h1>
          <span className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            {WEEKDAYS_LONG[isoWeekday(date)]}
          </span>
        </div>

        {hasWork && (
          <div className="mt-2.5 flex items-center gap-3">
            {/* İlerleme çubuğu: sayı kesin okumayı, çubuk hızlı
                taramayı sağlar. Renk tek başına bilgi taşımaz. */}
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
              role="progressbar"
              aria-valuenow={Math.round(ratio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Günün tamamlanma oranı"
            >
              {/* Gün tamamlandığında renk `good`'a geçer. Durum
                  bildirimi — kutlama değil; yüzde zaten yanında yazıyor
                  ve renk tek başına bilgi taşımıyor. */}
              <div
                className={cn(
                  "h-full rounded-full",
                  "transition-[width,background-color] duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
                  ratio >= 1
                    ? "bg-[var(--color-good)]"
                    : "bg-[var(--color-accent)]",
                )}
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>

            <span
              className={cn(
                "tabular shrink-0 text-[length:var(--text-sm)]",
                "transition-colors duration-[var(--duration-base)]",
                ratio >= 1
                  ? "font-medium text-[var(--color-ink)]"
                  : "text-[var(--color-ink-2)]",
              )}
            >
              {doneCount}/{totalCount} · {formatPercent(ratio)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
          style={{ animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}
