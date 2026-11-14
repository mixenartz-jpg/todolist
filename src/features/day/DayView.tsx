"use client";

import { useMemo, type ReactNode } from "react";
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
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import type { Task } from "@/features/tasks/types";
import type { PlanTaskActions } from "@/features/planlama/usePlanTaskActions";
import { useViewer } from "@/lib/auth/ViewerProvider";
import { todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { CoachNotesCard } from "./CoachNotesCard";
import { CompletionCard } from "./CompletionCard";
import { DailyLogForm } from "./DailyLogForm";
import { DayStrip } from "./DayStrip";
import { DayTaskRow, type CoachTaskControls } from "./DayTaskRow";
import { dayDots, dayMode, headline, isEditableDay, stripFor, type DayMode } from "./days";
import { ExtraWorkAdd } from "./ExtraWorkAdd";

const SUBTITLE: Record<DayMode, Record<"past" | "today" | "future", string | undefined>> = {
  student: {
    past: "Geçmiş gün — sonuçları düzenleyebilirsin",
    today: undefined,
    future: "Gelecek gün — yalnızca görüntüleme",
  },
  preview: { past: undefined, today: undefined, future: undefined },
  coach: {
    past: "Geçmiş gün — öğrencinin sonuçları salt okunur",
    today: undefined,
    future: "Gelecek gün — planı buradan yazabilirsin",
  },
};

/**
 * Bir günün ekranı. Öğrencinin "Bugün"ü, koçun önizlemesi ve koçun
 * Planlama → Gün görünümü HEP bu bileşendir; fark yalnızca `mode`:
 * böylece öğrencinin gördüğü ile koçun planladığı ekran aynı kalır.
 */
export function DayView({
  mode,
  date,
  hrefFor,
  coachActions,
  toolbar,
}: {
  mode: DayMode;
  date: DateStr;
  hrefFor: (d: DateStr) => string;
  /** Koç kipinde Planlama'nın görev eylemleri. */
  coachActions?: PlanTaskActions;
  /** Koç kipinde görev kartının sağ üstüne ek eylem (ör. gün paneli). */
  toolbar?: ReactNode;
}) {
  const viewer = useViewer();
  const toast = useToast();
  const today = todayStr();
  const studentId = viewer.studentId;

  const tasksQuery = useTasks();
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const days = useMemo(() => stripFor(mode, date, today), [mode, date, today]);
  const from = days[0];
  const to = days[days.length - 1];

  const resultsQuery = useTaskResults(studentId, from, to);
  const logsQuery = useDailyLogs(studentId, from, to);
  const notesQuery = useCoachNotes(studentId, date, date);

  const saveResult = useSaveTaskResult(studentId, (m) => toast.show(m));
  const saveLog = useSaveDailyLog(studentId, (m) => toast.show(m));
  const createTask = useCreateTask((m) => toast.show(m));
  const deleteTask = useDeleteTask((m) => toast.show(m));

  const editable = mode === "student" && isEditableDay(date, today, viewer.readOnly);
  const kind = dayMode(date, today);

  const dayTasks = useMemo(
    () => orderForDay(tasks.filter((t) => t.dueDate === date)),
    [tasks, date],
  );
  const marks = useMemo(() => dayDots(days, today, tasks), [days, today, tasks]);

  const isStudentAdded = (t: Task) => Boolean(t.createdBy && studentId && t.createdBy === studentId);
  const planned = dayTasks.filter((t) => !isStudentAdded(t));
  const extras = dayTasks.filter(isStudentAdded);

  const results = useMemo(() => indexResults(resultsQuery.data ?? []), [resultsQuery.data]);
  const log = (logsQuery.data ?? []).find((l) => l.date === date);
  const doneCount = dayTasks.filter((t) => t.done).length;

  const coach: CoachTaskControls | undefined =
    mode === "coach" && coachActions
      ? {
          onToggle: coachActions.onToggle,
          onRename: coachActions.onRename,
          onSetEstimate: coachActions.onSetEstimate,
          onDelete: coachActions.onDelete,
          onMove: (task, d) => coachActions.reschedule(task.id, d),
          onReorder: (task, delta) => coachActions.onReorder(dayTasks, task, delta),
        }
      : undefined;

  if (studentId === null && mode !== "coach") {
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

  // Devre dışı sorgu da `isPending` döner — öğrenci yoksa bekleme.
  const loading =
    tasksQuery.isPending ||
    (studentId !== null && (resultsQuery.isPending || logsQuery.isPending));

  const renderRow = (task: Task, index: number, list: readonly Task[]) => (
    <DayTaskRow
      key={`${task.id}|${date}`}
      mode={mode}
      task={task}
      date={date}
      result={results.get(resultKey(task.id, date))}
      editable={editable && !isPendingTask(task.id)}
      studentAdded={isStudentAdded(task)}
      onSave={(input) => saveResult.mutateAsync(input)}
      onDelete={isStudentAdded(task) ? () => deleteTask.mutate(task.id) : undefined}
      coach={coach}
      position={{ isFirst: index === 0, isLast: index === list.length - 1 }}
    />
  );

  return (
    <ScreenBody width="6xl" className="max-w-[60rem]">
      {mode === "preview" && (
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
        subtitle={SUBTITLE[mode][kind]}
      />

      <DayStrip days={days} selected={date} today={today} hrefFor={hrefFor} marks={marks} />

      {loading ? (
        <div className="grid gap-[var(--stack-gap)] md:grid-cols-2">
          <Skeleton height={320} />
          <Skeleton height={320} delayIndex={1} />
        </div>
      ) : (
        <div className="grid items-start gap-[var(--stack-gap)] md:grid-cols-2">
          <div className="flex flex-col gap-[var(--stack-gap)]">
            <Card as="section" aria-label="Günlük görevler">
              <SectionTitle level={2} trailing={mode === "coach" ? toolbar : undefined}>
                Günlük görevler
              </SectionTitle>
              {planned.length === 0 ? (
                <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                  {mode === "coach" ? "Bu güne görev yok." : "Bu güne koç görevi yazılmamış."}
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">{planned.map(renderRow)}</ul>
              )}

              {mode === "coach" && coachActions && (
                <div className="mt-3">
                  <TaskQuickAdd
                    dueDate={date}
                    pending={coachActions.addPending}
                    onAdd={(title) => coachActions.onAdd(title, date)}
                  />
                </div>
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
              <CoachNotesCard mode={mode} notes={notesQuery.data ?? []} date={date} studentId={studentId} />
            </div>
          </div>

          <div className="flex flex-col gap-[var(--stack-gap)]">
            <DailyLogForm
              key={date}
              mode={mode}
              date={date}
              log={log}
              disabled={!editable}
              onSave={(input) => saveLog.mutateAsync(input)}
            />
            <div className="md:hidden">
              <CoachNotesCard mode={mode} notes={notesQuery.data ?? []} date={date} studentId={studentId} />
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} variant={toast.variant} token={toast.token} onDismiss={toast.dismiss} />
    </ScreenBody>
  );
}
