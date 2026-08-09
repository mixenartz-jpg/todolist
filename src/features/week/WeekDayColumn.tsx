"use client";

import { isoWeekday, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { WEEKDAYS_SHORT } from "@/lib/ui/tr";
import { splitDaySchedule } from "@/features/tasks/schedule";
import { TaskItem } from "@/features/tasks/TaskItem";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import type { Task } from "@/features/tasks/types";
import type { WeekDay } from "@/features/tasks/week";
import { DayPicker } from "./DayPicker";
import "./week.css";

interface WeekDayColumnProps {
  day: WeekDay;
  weekStart: DateStr;
  today: DateStr;
  addPending: boolean;
  onAdd: (title: string, date: DateStr) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMove: (task: Task, date: DateStr) => void;
  onRename: (task: Task, title: string) => void;
  onSetTime: (
    task: Task,
    startTime: string | null,
    durationMinutes: number | null,
  ) => void;
}

/**
 * Haftalık ızgaranın bir gün sütunu.
 *
 * Görev satırları `TaskItem` ile çizilir — haftaya özel bir satır
 * bileşeni yazmak, tamamlanma animasyonunu, not satırını ve saat
 * çipini ikinci kez uygulamak olurdu.
 *
 * Saat çipi GİZLENMEZ (`hideTime` verilmez): gün planındaki sol oluk
 * burada yok, dolayısıyla saat yalnızca satırda görünüyor.
 *
 * Saat düzenleme burada da açıktır. Haftada saat verilememesi, planı
 * kurduğun ekranda planın en somut parçasının eksik kalması demekti;
 * kullanıcı yalnızca saat vermek için Bugün ekranına dönerdi.
 */
export function WeekDayColumn({
  day,
  weekStart,
  today,
  addPending,
  onAdd,
  onToggle,
  onDelete,
  onMove,
  onRename,
  onSetTime,
}: WeekDayColumnProps) {
  const isToday = day.date === today;

  // Gün içi sıralama gün planıyla AYNI kuralı izler: önce saatliler
  // saate göre, sonra saatsizler. Ayrı bir sıralama yazmak, aynı günün
  // Bugün ekranında ve haftada farklı sırada görünmesi demek olurdu.
  const { timed, untimed } = splitDaySchedule(day.tasks);
  const ordered = [...timed, ...untimed];

  return (
    <section
      aria-label={`${WEEKDAYS_SHORT[isoWeekday(day.date)]} ${toParts(day.date).day}`}
      className={cn(
        "weekDay",
        isToday && "weekDayToday",
        day.date < today && "weekDayPast",
      )}
    >
      <header className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-[length:var(--text-sm)]",
            isToday
              ? "font-medium text-[var(--color-accent)]"
              : "text-[var(--color-ink-2)]",
          )}
        >
          {WEEKDAYS_SHORT[isoWeekday(day.date)]}
        </span>
        <span className="tabular text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          {toParts(day.date).day}
        </span>

        {/* Sıfırken hiç gösterilmez: "0" bir bilgi değil, gürültüdür
            ve yedi sütunda yedi kez tekrarlanırdı. */}
        {day.openCount > 0 && (
          <span className="tabular ml-auto text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {day.openCount}
          </span>
        )}
      </header>

      {ordered.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {ordered.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              today={today}
              // Sütun ~140px: simgeler başlığın altına iner.
              compact
              onToggle={() => onToggle(task)}
              onDelete={() => onDelete(task)}
              onRename={(title) => onRename(task, title)}
              onSetTime={(start, duration) => onSetTime(task, start, duration)}
              dayPicker={
                <DayPicker
                  weekStart={weekStart}
                  current={day.date}
                  onPick={(date) => onMove(task, date)}
                />
              }
            />
          ))}
        </ul>
      )}

      <div className="mt-auto">
        <TaskQuickAdd
          dueDate={day.date}
          pending={addPending}
          onAdd={(title) => onAdd(title, day.date)}
        />
      </div>
    </section>
  );
}
