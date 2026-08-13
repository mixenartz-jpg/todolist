"use client";
import { ScreenBody } from "@/components/Screen";

import { useMemo, useState } from "react";
import { startOfIsoWeek, todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { Toast, useToast } from "@/components/Toast";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { TaskItem } from "@/features/tasks/TaskItem";
import { buildWeekPlan, weekContainsToday } from "@/features/tasks/week";
import {
  useCreateTask,
  useDeleteTask,
  useRenameTask,
  useRescheduleTask,
  useSetTaskTime,
  useToggleTask,
} from "@/features/tasks/mutations";
import { useTasks } from "@/features/tasks/queries";
import type { Task } from "@/features/tasks/types";
import { WeekGrid } from "./WeekGrid";
import { WeekSwitcher } from "./WeekSwitcher";

/**
 * Haftalık plan ekranı.
 *
 * Bugün ekranıyla AYNI görev verisini gösterir — ayrı bir "plan"
 * tablosu yoktur. Bir güne buradan eklenen görev Bugün ekranında da
 * görünür; iki ekran tek doğruluk kaynağının iki ölçeğidir.
 */
export function WeekScreen() {
  const today = useMemo(() => todayStr(), []);
  const toast = useToast();

  const [weekStart, setWeekStart] = useState<DateStr>(() => startOfIsoWeek(today));

  const tasksQuery = useTasks();
  const createTask = useCreateTask(toast.show);
  const toggleTask = useToggleTask(toast.show);
  const deleteTask = useDeleteTask(toast.show);
  const rescheduleTask = useRescheduleTask(toast.show);
  const renameTask = useRenameTask(toast.show);
  const setTaskTime = useSetTaskTime(toast.show);

  /*
   * `?? []` memo'nun İÇİNDE: dışarıda yazılsaydı her render'da yeni bir
   * dizi referansı üretir ve memo hiç tutmazdı.
   */
  const plan = useMemo(
    () => buildWeekPlan(tasksQuery.data ?? [], weekStart),
    [tasksQuery.data, weekStart],
  );

  const showOverdue =
    weekContainsToday(weekStart, today) && plan.overdue.length > 0;

  function handleMove(task: Task, dueDate: DateStr) {
    rescheduleTask.mutate({ id: task.id, dueDate });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WeekSwitcher
        weekStart={weekStart}
        onChange={setWeekStart}
        onThisWeek={() => setWeekStart(startOfIsoWeek(today))}
        isCurrentWeek={weekStart === startOfIsoWeek(today)}
      />

      <ScreenBody width="6xl">
        {tasksQuery.isPending ? (
          <WeekSkeleton />
        ) : (
          <>
            {/*
             * Gecikenler ızgaranın ÜSTÜNDE, hiçbir sütunun içinde
             * değil: gecikmiş bir görev bu haftanın hiçbir gününe
             * değil, "şimdi"ye aittir. Yalnızca içinde bulunulan
             * haftada gösterilir — gelecek bir haftaya bakarken
             * gecikme o haftanın meselesi değildir.
             */}
            {showOverdue && (
              <section>
                <SectionHeading
                  sectionKey="week.overdue"
                  onError={toast.show}
                  trailing={
                    <span className="tabular text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                      {plan.overdue.length}
                    </span>
                  }
                />

                <ul className="flex flex-col gap-1.5">
                  {plan.overdue.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      today={today}
                      onToggle={() =>
                        toggleTask.mutate({ id: task.id, done: !task.done })
                      }
                      onDelete={() => deleteTask.mutate(task.id)}
                      // Tek dokunuşluk çözüm yolu: gecikmeyi bugüne al.
                      onDefer={() =>
                        rescheduleTask.mutate({ id: task.id, dueDate: today })
                      }
                      onRename={(title) =>
                        renameTask.mutate({ id: task.id, title })
                      }
                    />
                  ))}
                </ul>
              </section>
            )}

            <WeekGrid
              plan={plan}
              weekStart={weekStart}
              today={today}
              addPending={createTask.isPending}
              onAdd={(title, date) =>
                createTask.mutate({ title, dueDate: date, note: null })
              }
              onToggle={(task) =>
                toggleTask.mutate({ id: task.id, done: !task.done })
              }
              onDelete={(task) => deleteTask.mutate(task.id)}
              onMove={handleMove}
              onRename={(task, title) =>
                renameTask.mutate({ id: task.id, title })
              }
              onSetTime={(task, startTime, durationMinutes) =>
                setTaskTime.mutate({ id: task.id, startTime, durationMinutes })
              }
            />
          </>
        )}
      </ScreenBody>

      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </div>
  );
}

function WeekSkeleton() {
  return (
    <div className="weekGrid" aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
    </div>
  );
}
