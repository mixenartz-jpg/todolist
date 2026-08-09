"use client";

import { isoWeekday, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { WEEKDAYS_SHORT } from "@/lib/ui/tr";
import { splitDaySchedule } from "@/features/tasks/schedule";
import { TaskItem } from "@/features/tasks/TaskItem";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import type { Task } from "@/features/tasks/types";
import type { PlanBucket } from "./plan";
import { ReorderButtons } from "./ReorderButtons";
import "./plan.css";

interface PlanWeekGridProps {
  buckets: readonly PlanBucket[];
  today: DateStr;
  /** Havuzdan seçili görev varsa günler yerleştirme hedefi olur. */
  placing: boolean;
  addPending: boolean;
  onPlace: (date: DateStr) => void;
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
 * Hafta ölçeğinin yedi sütunu.
 *
 * `WeekGrid`'den (features/week) AYRI: buradaki sütunlar yerleştirme
 * modunu, sıra düğmelerini ve "havuza geri at" eylemini biliyor.
 * Ortak bir bileşene zorlamak, Hafta ekranının hiç kullanmadığı beş
 * prop'u oradan da geçirmek demekti.
 *
 * Masaüstünde yan yana ızgara, mobilde dikey yığın — ayrım tamamen
 * CSS'te (plan.css).
 */
export function PlanWeekGrid({
  buckets,
  today,
  placing,
  addPending,
  onPlace,
  onAdd,
  onToggle,
  onDelete,
  onRename,
  onSetTime,
  onUnschedule,
  onReorder,
}: PlanWeekGridProps) {
  return (
    <div className="planWeekGrid">
      {buckets.map((bucket) => (
        <PlanDayColumn
          key={bucket.date}
          bucket={bucket}
          today={today}
          placing={placing}
          addPending={addPending}
          onPlace={onPlace}
          onAdd={onAdd}
          onToggle={onToggle}
          onDelete={onDelete}
          onRename={onRename}
          onSetTime={onSetTime}
          onUnschedule={onUnschedule}
          onReorder={onReorder}
        />
      ))}
    </div>
  );
}

function PlanDayColumn({
  bucket,
  today,
  placing,
  addPending,
  onPlace,
  onAdd,
  onToggle,
  onDelete,
  onRename,
  onSetTime,
  onUnschedule,
  onReorder,
}: {
  bucket: PlanBucket;
  today: DateStr;
  placing: boolean;
  addPending: boolean;
  onPlace: (date: DateStr) => void;
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
}) {
  const isToday = bucket.date === today;
  const weekday = WEEKDAYS_SHORT[isoWeekday(bucket.date)];
  const dayNumber = toParts(bucket.date).day;

  // Gün içi sıralama Bugün ekranıyla AYNI kuralı izler: önce saatliler
  // saate göre, sonra saatsizler. Ayrı bir sıralama yazmak, aynı günün
  // iki ekranda farklı sırada görünmesi demek olurdu.
  const { timed, untimed } = splitDaySchedule(bucket.tasks);
  const ordered = [...timed, ...untimed];

  return (
    <section
      aria-label={`${weekday} ${dayNumber}`}
      className={cn(
        "planDay",
        isToday && "planDayToday",
        bucket.date < today && "planDayPast",
        placing && "planDayTarget",
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
          {weekday}
        </span>
        <span className="tabular text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          {dayNumber}
        </span>

        {/* Sıfırken hiç gösterilmez: "0" bir bilgi değil, gürültüdür ve
            yedi sütunda yedi kez tekrarlanırdı. */}
        {bucket.openCount > 0 && (
          <span className="tabular ml-auto text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {bucket.openCount}
          </span>
        )}
      </header>

      {/* Yerleştirme hedefi AYRI bir düğmedir, sütunun tamamı değil:
          sütunun içinde zaten görev satırları ve ekleme kutusu var;
          hepsini saran bir tıklama hedefi onları yutardı. */}
      {placing && (
        <button
          type="button"
          onClick={() => onPlace(bucket.date)}
          className={cn(
            "rounded-lg border border-dashed border-[var(--color-accent)] px-2 py-1.5",
            "text-[length:var(--text-xs)] text-[var(--color-accent)]",
            "transition-colors duration-[var(--duration-fast)]",
            "hover:bg-[color-mix(in_oklch,var(--color-accent)_12%,transparent)]",
          )}
        >
          {weekday} {dayNumber} gününe koy
        </button>
      )}

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
              // "Ertele" simgesi burada havuza geri atar: planlarken
              // asıl ihtiyaç "bunu şimdilik geri koy"dur, bir gün
              // ilerletmek değil — o zaten sıradaki güne tıklamaktır.
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

      <div className="mt-auto">
        <TaskQuickAdd
          dueDate={bucket.date}
          pending={addPending}
          onAdd={(title) => onAdd(title, bucket.date)}
        />
      </div>
    </section>
  );
}
