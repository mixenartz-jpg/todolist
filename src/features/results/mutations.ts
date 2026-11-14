"use client";

import { useMutation, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import type { DateStr } from "@/lib/date/types";
import type { CoachNoteRow, DailyLogRow, TaskResultRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/features/tasks/types";
import { toCoachNote, toDailyLog, toTaskResult } from "./queries";
import type { CoachNote, DailyLog, DailyLogInput, TaskResult, TaskResultInput } from "./types";

/**
 * Aralık önbelleklerinde (`[kök, öğrenci, from, to]`) bir satırı
 * iyimser olarak yerleştir. Yalnızca tarihi aralığa düşen önbellekler
 * değişir; geri alma için önceki hâller döner.
 */
function upsertInRanges<T extends { date: DateStr }>(
  qc: QueryClient,
  root: QueryKey,
  studentId: string,
  item: T,
  same: (a: T) => boolean,
): Array<[QueryKey, T[] | undefined]> {
  const snapshots = qc.getQueriesData<T[]>({ queryKey: root });
  for (const [key, data] of snapshots) {
    const [, sid, from, to] = key as [string, string, DateStr, DateStr];
    if (sid !== studentId || !data) continue;
    if (item.date < from || item.date > to) continue;
    const rest = data.filter((x) => !same(x));
    qc.setQueryData<T[]>(key, [...rest, item]);
  }
  return snapshots;
}

function restore<T>(qc: QueryClient, snapshots: Array<[QueryKey, T | undefined]> | undefined) {
  for (const [key, data] of snapshots ?? []) qc.setQueryData(key, data);
}

function toResultRow(studentId: string, r: TaskResultInput) {
  return {
    task_id: r.taskId,
    date: r.date,
    student_id: studentId,
    status: r.status,
    total: r.total,
    correct: r.correct,
    wrong: r.wrong,
    empty: r.empty,
    actual_minutes: r.actualMinutes,
    missing_topics: r.missingTopics,
    reason: r.reason,
    note: r.note,
  };
}

/**
 * Görev sonucunu kaydet (upsert). Durum "done" olunca `tasks.done`
 * veritabanında trigger ile eşitlenir; burada görev önbelleği de
 * iyimser olarak çevrilir ki yüzde anında güncellensin.
 */
export function useSaveTaskResult(studentId: string | null, onError?: (m: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: TaskResultInput): Promise<TaskResult> => {
      if (!studentId) throw new Error("Öğrenci yok");
      const { data, error } = await createClient()
        .from("task_results")
        .upsert(toResultRow(studentId, input), { onConflict: "task_id,date" })
        .select()
        .single();
      if (error) throw error;
      return toTaskResult(data as TaskResultRow);
    },

    onMutate: async (input) => {
      if (!studentId) return undefined;
      await qc.cancelQueries({ queryKey: qk.taskResults() });
      await qc.cancelQueries({ queryKey: qk.tasks() });

      const optimistic: TaskResult = {
        ...input,
        studentId,
        updatedAt: new Date().toISOString(),
      };
      const results = upsertInRanges(
        qc,
        qk.taskResults(),
        studentId,
        optimistic,
        (r) => r.taskId === input.taskId && r.date === input.date,
      );

      const tasks = qc.getQueryData<Task[]>(qk.tasks());
      const done = input.status === "done";
      qc.setQueryData<Task[]>(qk.tasks(), (list) =>
        list?.map((t) =>
          t.id === input.taskId && t.done !== done
            ? { ...t, done, completedAt: done ? new Date().toISOString() : null }
            : t,
        ),
      );

      return { results, tasks };
    },

    onError: (err, _input, ctx) => {
      restore(qc, ctx?.results);
      if (ctx) qc.setQueryData(qk.tasks(), ctx.tasks);
      onError?.(err instanceof Error ? err.message : "Kaydedilemedi");
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.taskResults() });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
  });
}

/** Günlük formu kaydet (upsert, (öğrenci, gün) anahtarı). */
export function useSaveDailyLog(studentId: string | null, onError?: (m: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: DailyLogInput): Promise<DailyLog> => {
      if (!studentId) throw new Error("Öğrenci yok");
      const { data, error } = await createClient()
        .from("daily_logs")
        .upsert(
          {
            student_id: studentId,
            date: input.date,
            sleep_at: input.sleepAt,
            wake_at: input.wakeAt,
            study_bucket: input.studyBucket,
            screen_bucket: input.screenBucket,
            energy: input.energy,
            note: input.note,
          },
          { onConflict: "student_id,date" },
        )
        .select()
        .single();
      if (error) throw error;
      return toDailyLog(data as DailyLogRow);
    },

    onMutate: async (input) => {
      if (!studentId) return undefined;
      await qc.cancelQueries({ queryKey: qk.dailyLogs() });
      const snapshots = upsertInRanges(
        qc,
        qk.dailyLogs(),
        studentId,
        { ...input, studentId, updatedAt: new Date().toISOString() },
        (l) => l.date === input.date,
      );
      return { snapshots };
    },

    onError: (err, _input, ctx) => {
      restore(qc, ctx?.snapshots);
      onError?.(err instanceof Error ? err.message : "Kaydedilemedi");
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.dailyLogs() }),
  });
}

/**
 * Koç notunu kaydet. Boş metin → not silinir (boş satır tutmayız).
 */
export function useSaveCoachNote(studentId: string | null, onError?: (m: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      note,
      scale = "day",
    }: {
      date: DateStr;
      note: string;
      scale?: "day" | "week";
    }): Promise<CoachNote | null> => {
      if (!studentId) throw new Error("Bağlı öğrenci yok");
      const supabase = createClient();
      const text = note.trim();

      if (text === "") {
        const { error } = await supabase
          .from("coach_notes")
          .delete()
          .eq("student_id", studentId)
          .eq("date", date)
          .eq("scale", scale);
        if (error) throw error;
        return null;
      }

      const { data, error } = await supabase
        .from("coach_notes")
        .upsert(
          { student_id: studentId, date, scale, note: text },
          { onConflict: "student_id,date,scale" },
        )
        .select()
        .single();
      if (error) throw error;
      return toCoachNote(data as CoachNoteRow);
    },

    onError: (err) => onError?.(err instanceof Error ? err.message : "Kaydedilemedi"),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.coachNotes() }),
  });
}

/** Boş bir sonuç taslağı (form ilk açıldığında). */
export function emptyResult(taskId: string, date: DateStr): TaskResultInput {
  return {
    taskId,
    date,
    status: null,
    total: null,
    correct: null,
    wrong: null,
    empty: null,
    actualMinutes: null,
    missingTopics: [],
    reason: null,
    note: null,
  };
}
