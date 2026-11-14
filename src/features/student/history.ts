import { eachDay } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";
import { isLogFilled } from "@/features/results/format";
import type { CoachNote, DailyLog, TaskResult } from "@/features/results/types";

export interface DayRecord {
  date: DateStr;
  total: number;
  done: number;
  /** Durumu "yapılmadı" ya da "yarım" olan görev sayısı. */
  missed: number;
  formFilled: boolean;
  hasCoachNote: boolean;
}

/**
 * Gün gün özet — Geçmiş listesi ve koçun öğrenci sayfası için.
 * En yeni gün başta. Hiç görevi ve formu olmayan günler atlanır.
 */
export function dayRecords(
  tasks: readonly Task[],
  results: readonly TaskResult[],
  logs: readonly DailyLog[],
  notes: readonly CoachNote[],
  from: DateStr,
  to: DateStr,
): DayRecord[] {
  const out: DayRecord[] = [];
  for (const date of eachDay(from, to).reverse()) {
    const dayTasks = tasks.filter((t) => t.dueDate === date);
    const dayResults = results.filter((r) => r.date === date);
    const log = logs.find((l) => l.date === date);
    const rec: DayRecord = {
      date,
      total: dayTasks.length,
      done: dayTasks.filter((t) => t.done).length,
      missed: dayResults.filter((r) => r.status === "skipped" || r.status === "partial").length,
      formFilled: isLogFilled(log),
      hasCoachNote: notes.some((n) => n.date === date && n.scale === "day"),
    };
    if (rec.total > 0 || rec.formFilled) out.push(rec);
  }
  return out;
}
