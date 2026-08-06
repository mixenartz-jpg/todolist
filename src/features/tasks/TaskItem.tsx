"use client";

import { memo } from "react";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatShortDate } from "@/lib/ui/tr";
import { isOverdue } from "./queries";
import type { Task } from "./types";

interface TaskItemProps {
  task: Task;
  today: DateStr;
  onToggle: () => void;
  onDelete: () => void;
  /** Yarına ertele. Tarihsiz görevlerde gösterilmez. */
  onDefer?: () => void;
}

export const TaskItem = memo(function TaskItem({
  task,
  today,
  onToggle,
  onDelete,
  onDefer,
}: TaskItemProps) {
  const overdue = isOverdue(task, today);

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-3 py-2.5",
        "transition-colors duration-[var(--duration-base)]",
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
        className="grid size-10 shrink-0 place-items-center rounded-lg transition-transform duration-[var(--duration-fast)] active:scale-95"
      >
        <span
          className={cn(
            "grid size-[22px] place-items-center rounded-md transition-colors duration-[var(--duration-fast)]",
            task.done
              ? "bg-[var(--color-ink-3)]"
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
            "truncate text-[length:var(--text-base)]",
            task.done && "text-[var(--color-ink-3)] line-through",
          )}
        >
          {task.title}
        </div>

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

      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-[var(--duration-fast)] focus-within:opacity-100 group-hover:opacity-100">
        {onDefer && !task.done && (
          <IconButton label={`${task.title}: yarına ertele`} onClick={onDefer}>
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
