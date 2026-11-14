"use client";

import { useMemo } from "react";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";
import { Skeleton } from "@/components/Skeleton";
import { Toast, useToast } from "@/components/Toast";
import { ScreenBody } from "@/components/Screen";
import { useSaveDailyLog, useSaveTaskResult } from "@/features/results/mutations";
import {
  indexResults,
  resultKey,
  useCoachNotes,
  useDailyLogs,
  useTaskResults,
} from "@/features/results/queries";
import { orderForDay } from "@/features/tasks/dayorder";
import { useCreateTask, useDeleteTask } from "@/features/tasks/mutations";
import { useTasks } from "@/features/tasks/queries";
import { isPendingTask } from "@/features/tasks/pending";
import type { Task } from "@/features/tasks/types";
import { useViewer } from "@/lib/auth/ViewerProvider";
import { todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { CoachNotesCard } from "./CoachNotesCard";
import { CompletionCard } from "./CompletionCard";
import { DailyLogForm } from "./DailyLogForm";
import { DayStrip } from "./DayStrip";
import { dayMode, headline, isEditableDay, stripDays } from "./days";
import { ExtraWorkAdd } from "./ExtraWorkAdd";
import { StudentTaskRow } from "./StudentTaskRow";

const MODE_SUBTITLE = {
  past: "Geçmiş gün — sonuçları düzenleyebilirsin",
  today: undefined,
  future: "Gelecek gün — yalnızca görüntüleme",
} as const;

/**
 * Öğrencinin ana ekranı: seçili günün görevleri + sonuç girişi,
 * günlük form ve koçun notu. Koç aynı ekranı salt okunur önizler.
 */
export function StudentTodayScreen({ day }: { day: DateStr | null }) {
  const viewer = useViewer();
  const toast = useToast();
  const today = todayStr();
  const date = day ?? today;
  const studentId = viewer.studentId;

  const days = useMemo(() => stripDays(today), [today]);
  const from = days[0] < date ? days[0] : date;
  const to = days[days.length - 1] > date ? days[days.length - 1] : date;

  const tasksQuery = useTasks();
  const resultsQuery = useTaskResults(studentId, from, to);
  const logsQuery = useDailyLogs(studentId, from, to);
  const notesQuery = useCoachNotes(studentId, date, date);

  const saveResult = useSaveTaskResult(studentId, (m) => toast.show(m));
  const saveLog = useSaveDailyLog(studentId, (m) => toast.show(m));
  const createTask = useCreateTask((m) => toast.show(m));
  const deleteTask = useDeleteTask((m) => toast.show(m));

  const editable = isEditableDay(date, today, viewer.readOnly);
  const mode = dayMode(date, today);

  const dayTasks = useMemo(
    () => orderForDay((tasksQuery.data ?? []).filter((t) => t.dueDate === date)),
    [tasksQuery.data, date],
  );

  const isStudentAdded = (t: Task) => Boolean(t.createdBy && studentId && t.createdBy === studentId);
  const planned = dayTasks.filter((t) => !isStudentAdded(t));
  const extras = dayTasks.filter(isStudentAdded);

  const results = useMemo(() => indexResults(resultsQuery.data ?? []), [resultsQuery.data]);
  const log = (logsQuery.data ?? []).find((l) => l.date === date);
  const doneCount = dayTasks.filter((t) => t.done).length;

  const hrefFor = (d: DateStr) => (d === today ? "/ogrenci/bugun" : `/ogrenci/bugun?gun=${d}`);

  if (studentId === null) {
    return (
      <ScreenBody width="3xl">
        <Card>
          <SectionTitle>Bağlı öğrenci yok</SectionTitle>
          <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            Önizleme için önce bir öğrenci hesabı bağlanmalı. Supabase → Authentication → Add user
            ile hesabı aç, sonra SQL Editor&apos;de çalıştır:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-[var(--color-surface-2)] p-3 text-[length:var(--text-sm)]">
            select public.link_student(&apos;ogrenci@mail&apos;, &apos;koc@mail&apos;);
          </pre>
        </Card>
      </ScreenBody>
    );
  }

  const loading = tasksQuery.isPending || resultsQuery.isPending || logsQuery.isPending;

  const renderRow = (task: Task) => (
    <StudentTaskRow
      key={`${task.id}|${date}`}
      task={task}
      date={date}
      result={results.get(resultKey(task.id, date))}
      editable={editable && !isPendingTask(task.id)}
      studentAdded={isStudentAdded(task)}
      onSave={(input) => saveResult.mutateAsync(input)}
      onDelete={isStudentAdded(task) ? () => deleteTask.mutate(task.id) : undefined}
    />
  );

  return (
    <ScreenBody width="6xl" className="max-w-[60rem]">
      {viewer.readOnly && (
        <p
          role="status"
          className="rounded-lg border border-[color-mix(in_oklch,var(--color-accent)_45%,transparent)] bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)] px-3 py-2 text-[length:var(--text-sm)] text-[var(--color-ink)]"
        >
          Öğrenci gözüyle önizleme — salt okunur
          {viewer.studentName ? ` · ${viewer.studentName}` : ""}
        </p>
      )}

      <CompletionCard
        title={headline(date)}
        done={doneCount}
        total={dayTasks.length}
        subtitle={MODE_SUBTITLE[mode]}
      />

      <DayStrip days={days} selected={date} today={today} hrefFor={hrefFor} />

      {loading ? (
        <div className="grid gap-[var(--stack-gap)] md:grid-cols-2">
          <Skeleton height={320} />
          <Skeleton height={320} delayIndex={1} />
        </div>
      ) : (
        <div className="grid items-start gap-[var(--stack-gap)] md:grid-cols-2">
          <div className="flex flex-col gap-[var(--stack-gap)]">
            <Card as="section" aria-label="Günlük görevler">
              <SectionTitle level={2}>Günlük görevler</SectionTitle>
              {planned.length === 0 ? (
                <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                  Bu güne koç görevi yazılmamış.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">{planned.map(renderRow)}</ul>
              )}

              {(extras.length > 0 || editable) && (
                <div className="mt-4 border-t border-[var(--color-line)] pt-3">
                  <SectionTitle level={3}>Ek çalışma</SectionTitle>
                  {extras.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-2">{extras.map(renderRow)}</ul>
                  )}
                  {editable && (
                    <div className="mt-2">
                      <ExtraWorkAdd
                        onAdd={(title) => createTask.mutate({ title, dueDate: date, note: null })}
                      />
                    </div>
                  )}
                </div>
              )}
            </Card>

            <div className="hidden md:block">
              <CoachNotesCard notes={notesQuery.data ?? []} />
            </div>
          </div>

          <div className="flex flex-col gap-[var(--stack-gap)]">
            <DailyLogForm
              key={date}
              date={date}
              log={log}
              disabled={!editable}
              onSave={(input) => saveLog.mutateAsync(input)}
            />
            <div className="md:hidden">
              <CoachNotesCard notes={notesQuery.data ?? []} />
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </ScreenBody>
  );
}
