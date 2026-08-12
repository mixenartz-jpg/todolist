"use client";

import type { DateStr } from "@/lib/date/types";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { TaskItem } from "@/features/tasks/TaskItem";
import type { Task } from "@/features/tasks/types";
import type { PlanTaskActions } from "./usePlanTaskActions";

interface PlanOverdueProps {
  tasks: readonly Task[];
  today: DateStr;
  actions: PlanTaskActions;
  onError: (message: string) => void;
}

/**
 * Gecikenler şeridi.
 *
 * Izgaranın ÜSTÜNDE, hiçbir hücrenin içinde değil: gecikmiş bir görev
 * görüntülenen aralığın hiçbir gününe değil, "şimdi"ye aittir. Bir
 * hücreye konsaydı hem orada hem kendi tarihinde iki kez görünürdü
 * (bkz. range.ts'in çifte sayım gerekçesi).
 */
export function PlanOverdue({
  tasks,
  today,
  actions,
  onError,
}: PlanOverdueProps) {
  if (tasks.length === 0) return null;

  return (
    <section>
      <SectionHeading
        sectionKey="plan.overdue"
        onError={onError}
        trailing={
          <span className="tabular text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            {tasks.length}
          </span>
        }
      />

      <ul className="flex flex-col gap-1.5">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            today={today}
            onToggle={() => actions.onToggle(task)}
            onDelete={() => actions.onDelete(task)}
            // Tek dokunuşluk çözüm yolu: gecikmeyi bugüne al.
            onDefer={() => actions.reschedule(task.id, today)}
            onRename={(title) => actions.onRename(task, title)}
          />
        ))}
      </ul>
    </section>
  );
}
