"use client";

import { isoWeekday, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { WEEKDAYS_SHORT } from "@/lib/ui/tr";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import type { Task } from "@/features/tasks/types";
import { PlanTaskList } from "./PlanTaskList";
import type { PlanBucket } from "./range";
import type { Category } from "./types";
import "./planlama.css";

interface PlanWeekGridProps {
  buckets: readonly PlanBucket[];
  today: DateStr;
  /** Kimlikten kategoriye — satırdaki renk noktası için. */
  categoryById: ReadonlyMap<string, Category>;
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
 * Ay kutusuyla paylaşılan tek parça `PlanTaskList`'tir: sütunun KABI
 * (içerik kadar uzar) ile ay kutusunun kabı (sabit boy + iç kaydırma)
 * ayrışıyor, ama içindeki liste birebir aynı.
 *
 * Masaüstünde yan yana ızgara, mobilde dikey yığın — ayrım tamamen
 * CSS'te (planlama.css).
 */
export function PlanWeekGrid({
  buckets,
  today,
  categoryById,
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
          categoryById={categoryById}
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
  categoryById,
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
  categoryById: ReadonlyMap<string, Category>;
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

      <PlanTaskList
        tasks={bucket.tasks}
        today={today}
        categoryById={categoryById}
        className="flex flex-col gap-1.5"
        onToggle={onToggle}
        onDelete={onDelete}
        onRename={onRename}
        onSetTime={onSetTime}
        onUnschedule={onUnschedule}
        onReorder={onReorder}
      />

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
