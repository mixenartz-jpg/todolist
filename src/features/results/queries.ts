"use client";

import { useQuery } from "@tanstack/react-query";
import { asDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { CoachNoteRow, DailyLogRow, TaskResultRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { CoachNote, DailyLog, TaskResult } from "./types";

/*
 * Öğrenci verisinin üç sorgusu. Hepsi (öğrenci, tarih aralığı)
 * şeklinde: bir öğrencinin birkaç haftası yüzlerce satırı geçmez.
 * `studentId` null ise (koçun henüz öğrencisi yok) sorgu çalışmaz.
 */

export function useTaskResults(studentId: string | null, from: DateStr, to: DateStr) {
  return useQuery({
    queryKey: qk.taskResultsRange(studentId ?? "-", from, to),
    enabled: studentId !== null,
    queryFn: async (): Promise<TaskResult[]> => {
      const { data, error } = await createClient()
        .from("task_results")
        .select("*")
        .eq("student_id", studentId!)
        .gte("date", from)
        .lte("date", to);
      if (error) throw error;
      return (data as TaskResultRow[]).map(toTaskResult);
    },
  });
}

export function useDailyLogs(studentId: string | null, from: DateStr, to: DateStr) {
  return useQuery({
    queryKey: qk.dailyLogsRange(studentId ?? "-", from, to),
    enabled: studentId !== null,
    queryFn: async (): Promise<DailyLog[]> => {
      const { data, error } = await createClient()
        .from("daily_logs")
        .select("*")
        .eq("student_id", studentId!)
        .gte("date", from)
        .lte("date", to);
      if (error) throw error;
      return (data as DailyLogRow[]).map(toDailyLog);
    },
  });
}

export function useCoachNotes(studentId: string | null, from: DateStr, to: DateStr) {
  return useQuery({
    queryKey: qk.coachNotesRange(studentId ?? "-", from, to),
    enabled: studentId !== null,
    queryFn: async (): Promise<CoachNote[]> => {
      const { data, error } = await createClient()
        .from("coach_notes")
        .select("*")
        .eq("student_id", studentId!)
        .gte("date", from)
        .lte("date", to);
      if (error) throw error;
      return (data as CoachNoteRow[]).map(toCoachNote);
    },
  });
}

export function toTaskResult(row: TaskResultRow): TaskResult {
  return {
    taskId: row.task_id,
    date: asDateStr(row.date),
    studentId: row.student_id,
    status: row.status,
    total: row.total,
    correct: row.correct,
    wrong: row.wrong,
    empty: row.empty,
    actualMinutes: row.actual_minutes,
    missingTopics: row.missing_topics ?? [],
    reason: row.reason,
    note: row.note,
    updatedAt: row.updated_at,
  };
}

/** Postgres `time` "23:30:00" döner; arayüz "23:30" konuşur. */
function hhmm(t: string | null): string | null {
  return t ? t.slice(0, 5) : null;
}

export function toDailyLog(row: DailyLogRow): DailyLog {
  return {
    studentId: row.student_id,
    date: asDateStr(row.date),
    sleepAt: hhmm(row.sleep_at),
    wakeAt: hhmm(row.wake_at),
    studyBucket: row.study_bucket,
    screenBucket: row.screen_bucket,
    energy: row.energy,
    note: row.note,
    updatedAt: row.updated_at,
  };
}

export function toCoachNote(row: CoachNoteRow): CoachNote {
  return {
    coachId: row.coach_id,
    studentId: row.student_id,
    date: asDateStr(row.date),
    scale: row.scale,
    note: row.note,
    updatedAt: row.updated_at,
  };
}

/** Sonuçları "görev|gün" anahtarıyla eşle. */
export function resultKey(taskId: string, date: DateStr): string {
  return `${taskId}|${date}`;
}

export function indexResults(results: readonly TaskResult[]): Map<string, TaskResult> {
  return new Map(results.map((r) => [resultKey(r.taskId, r.date), r]));
}
