"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useCoachNotes, useDailyLogs, useTaskResults } from "@/features/results/queries";
import type { CoachNote, DailyLog, TaskResult } from "@/features/results/types";
import { useOptionalViewer } from "@/lib/auth/ViewerProvider";
import { addDays, todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";

/**
 * Koç ekranlarının öğrenci verisi: sonuçlar, günlük formlar, koç
 * notları. Planlama ağacının derinindeki satırlara prop zinciri
 * kurmadan ulaşsın diye bağlam olarak sağlanır.
 *
 * Pencere: 60 gün geri, 30 gün ileri — Planlama'nın ay görünümünü
 * rahat kapsar; bir öğrencinin 90 günü birkaç yüz satırdır.
 */
interface StudentData {
  studentId: string | null;
  /** Görev → o göreve girilmiş sonuçlar (yeniden eskiye). */
  resultsByTask: ReadonlyMap<string, readonly TaskResult[]>;
  logByDate: ReadonlyMap<DateStr, DailyLog>;
  noteByDate: ReadonlyMap<DateStr, CoachNote>;
}

const Ctx = createContext<StudentData | null>(null);

export const WINDOW_BACK = 60;
export const WINDOW_AHEAD = 30;

export function StudentDataProvider({ children }: { children: ReactNode }) {
  const viewer = useOptionalViewer();
  const studentId = viewer?.studentId ?? null;
  const today = todayStr();
  const from = addDays(today, -WINDOW_BACK);
  const to = addDays(today, WINDOW_AHEAD);

  const results = useTaskResults(studentId, from, to);
  const logs = useDailyLogs(studentId, from, to);
  const notes = useCoachNotes(studentId, from, to);

  const value = useMemo<StudentData>(() => {
    const resultsByTask = new Map<string, TaskResult[]>();
    for (const r of results.data ?? []) {
      const list = resultsByTask.get(r.taskId) ?? [];
      list.push(r);
      resultsByTask.set(r.taskId, list);
    }
    for (const list of resultsByTask.values()) list.sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
      studentId,
      resultsByTask,
      logByDate: new Map((logs.data ?? []).map((l) => [l.date, l])),
      noteByDate: new Map(
        (notes.data ?? []).filter((n) => n.scale === "day").map((n) => [n.date, n]),
      ),
    };
  }, [studentId, results.data, logs.data, notes.data]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Sağlayıcı yoksa null — bileşen hiçbir şey çizmez. */
export function useStudentData(): StudentData | null {
  return useContext(Ctx);
}
