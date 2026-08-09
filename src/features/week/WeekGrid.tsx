"use client";

import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";
import type { WeekPlan } from "@/features/tasks/week";
import { WeekDayColumn } from "./WeekDayColumn";
import "./week.css";

interface WeekGridProps {
  plan: WeekPlan;
  weekStart: DateStr;
  today: DateStr;
  addPending: boolean;
  onAdd: (title: string, date: DateStr) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMove: (task: Task, date: DateStr) => void;
}

/**
 * Haftanın yedi sütunu.
 *
 * Masaüstünde yan yana ızgara, mobilde dikey yığın — ayrım tamamen
 * CSS'te (week.css). Aynı bileşen ağacı iki yerleşimi de besler:
 * yerleşim başına ayrı bir bileşen yazmak, her davranış değişikliğini
 * iki kez uygulamak demek olurdu.
 */
export function WeekGrid({
  plan,
  weekStart,
  today,
  addPending,
  onAdd,
  onToggle,
  onDelete,
  onMove,
}: WeekGridProps) {
  return (
    <div className="weekGrid">
      {plan.days.map((day) => (
        <WeekDayColumn
          key={day.date}
          day={day}
          weekStart={weekStart}
          today={today}
          addPending={addPending}
          onAdd={onAdd}
          onToggle={onToggle}
          onDelete={onDelete}
          onMove={onMove}
        />
      ))}
    </div>
  );
}
