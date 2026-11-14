"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Card } from "@/components/Card";
import { ScreenBody } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { Skeleton } from "@/components/Skeleton";
import { Toast, useToast } from "@/components/Toast";
import { computeAlerts } from "@/features/alerts/alerts";
import {
  completionTone,
  formatMinutesShort,
  TONE_COLOR,
} from "@/features/results/format";
import { useDailyLogs, useResultsDoneOn, useTaskResults } from "@/features/results/queries";
import { STATUS_LABELS } from "@/features/results/types";
import { useCreateTask } from "@/features/tasks/mutations";
import { orderForDay } from "@/features/tasks/dayorder";
import { useTasks } from "@/features/tasks/queries";
import { useRoutineTaskSync } from "@/features/routines/useRoutineTaskSync";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import { useViewer } from "@/lib/auth/ViewerProvider";
import { addDays, isoWeekday, todayStr } from "@/lib/date/date";
import { formatShortDate, WEEKDAYS_MIN } from "@/lib/ui/tr";
import {
  attention,
  doneTodayElsewhere,
  todayBoard,
  weekSummary,
  type BoardState,
  type CoachDay,
} from "./coachSummary";

/** Uyarılar ve "dikkat" kartı 14 gün geriye bakar. */
const LOOKBACK_DAYS = 14;

/**
 * Koç paneli — tek ekranda dört soru:
 *  1. Bugün: öğrenci nerede, ne kaldı?
 *  2. Bu hafta: gün gün tamamlanma, plan–gerçek, çalışma, uyku.
 *  3. Dikkat: yapılmayan/yarım kalanlar ve sık eksik konular.
 *  4. Hızlı eylem: yarına görev ekle.
 * Üstte yalnızca TETİKLENEN uyarılar. Rutin ısı haritası, hedef
 * listesi ve motivasyon cümlesi kaldırıldı: biri öğrenci akışında yok,
 * diğerleri Planlama/İstatistik'te zaten var.
 */
export function DashboardScreen() {
  const viewer = useViewer();
  const toast = useToast();
  const today = todayStr();
  const tomorrow = addDays(today, 1);
  const from = addDays(today, -LOOKBACK_DAYS);
  const studentId = viewer.studentId;

  const tasksQuery = useTasks();
  useRoutineTaskSync();
  const resultsQuery = useTaskResults(studentId, from, tomorrow);
  const logsQuery = useDailyLogs(studentId, from, today);
  const doneTodayQuery = useResultsDoneOn(studentId, today);
  const createTask = useCreateTask((m) => toast.show(m));

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const results = useMemo(() => resultsQuery.data ?? [], [resultsQuery.data]);
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  const week = useMemo(() => weekSummary(today, tasks, results, logs), [today, tasks, results, logs]);
  const focus = useMemo(() => attention(today, tasks, results), [today, tasks, results]);
  const alerts = useMemo(
    () => (studentId ? computeAlerts({ today, tasks, results, logs }) : []),
    [studentId, today, tasks, results, logs],
  );

  const todayTasks = orderForDay(tasks.filter((t) => t.dueDate === today));
  const todayDone = todayTasks.filter((t) => t.done).length;
  const board = todayBoard(today, todayTasks, results);
  const early = doneTodayElsewhere(today, tasks, doneTodayQuery.data ?? []);
  const tomorrowCount = tasks.filter((t) => t.dueDate === tomorrow).length;

  const loading =
    tasksQuery.isPending || (studentId !== null && (resultsQuery.isPending || logsQuery.isPending));

  return (
    <ScreenBody width="6xl" className="max-w-[60rem]">
      {studentId === null && (
        <Card tone="sunken">
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            Henüz bağlı öğrenci yok. Supabase → Authentication → Add user ile hesabı aç, sonra SQL
            Editor&apos;de <code>select public.link_student(&apos;ogrenci@mail&apos;, &apos;koc@mail&apos;);</code>
          </p>
        </Card>
      )}

      {alerts.length > 0 && (
        <ul aria-label="Uyarılar" className="flex flex-wrap gap-1.5">
          {alerts.map((a) => (
            <li
              key={a.kind + a.text}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[color-mix(in_oklch,var(--color-warn)_45%,transparent)] bg-[color-mix(in_oklch,var(--color-warn)_10%,transparent)] px-2.5 text-[length:var(--text-sm)] text-[var(--color-ink)]"
            >
              <span aria-hidden className="text-[var(--color-warn)]">!</span>
              {a.text}
            </li>
          ))}
        </ul>
      )}

      {loading ? (
        <div className="grid gap-[var(--stack-gap)] md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={220} delayIndex={i} />
          ))}
        </div>
      ) : (
        <div className="grid items-start gap-[var(--stack-gap)] md:grid-cols-2">
          {/* 1. Bugün */}
          <Card as="section" aria-label="Bugün">
            <SectionTitle trailing={<Percent done={todayDone} total={todayTasks.length} />}>
              Bugün
            </SectionTitle>
            <Bar done={todayDone} total={todayTasks.length} />
            {todayTasks.length === 0 ? (
              <Muted className="mt-3">Bugüne görev yok.</Muted>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {board.map((row) => (
                  <li key={row.task.id} className="flex items-start gap-2 text-[length:var(--text-sm)]">
                    <StateIcon state={row.state} />
                    <div className="min-w-0 flex-1">
                      <p className={row.state === "done" ? "text-[var(--color-ink-2)]" : undefined}>{row.task.title}</p>
                      {row.summary && (
                        <p className="text-[length:var(--text-2xs)] tabular-nums text-[var(--color-ink-3)]">
                          {row.summary}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {early.length > 0 && (
              <p className="mt-3 border-t border-[var(--color-line)] pt-2 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                <span className="text-[var(--color-accent)]">Bugün erken yapıldı:</span>{" "}
                {early
                  .map((e) => `${e.task.title} (${formatShortDate(e.plannedFor)}${e.state === "partial" ? ", yarım" : ""})`)
                  .join(" · ")}
              </p>
            )}
          </Card>

          {/* 2. Bu hafta */}
          <Card as="section" aria-label="Bu hafta">
            <SectionTitle
              trailing={
                week.adherence !== null && (
                  <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                    Plan uyumu{" "}
                    <strong className="tabular-nums" style={{ color: TONE_COLOR[completionTone(week.adherence)] }}>
                      %{Math.round(week.adherence * 100)}
                    </strong>
                  </span>
                )
              }
            >
              Bu hafta
            </SectionTitle>
            <WeekBars days={week.days} today={today} />
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Çalışma" value={week.totalStudyMinutes ? formatMinutesShort(week.totalStudyMinutes) : "—"} />
              <Stat label="Plan / gerçek" value={`${formatMinutesShort(week.plannedMinutes)} / ${formatMinutesShort(week.actualMinutes)}`} />
              <Stat label="Ort. uyku" value={week.avgSleepMinutes !== null ? formatMinutesShort(week.avgSleepMinutes) : "—"} />
            </dl>
          </Card>

          {/* 3. Dikkat */}
          <Card as="section" aria-label="Dikkat gerektirenler">
            <SectionTitle>Dikkat · son 7 gün</SectionTitle>
            {focus.missed.length === 0 && focus.topics.length === 0 ? (
              <Muted className="mt-2">Yapılmayan ya da eksik konu yok.</Muted>
            ) : (
              <>
                {focus.missed.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {focus.missed.slice(0, 4).map((m) => (
                      <li key={m.taskId + m.date} className="text-[length:var(--text-sm)]">
                        <div className="flex items-baseline gap-2">
                          <span
                            className="shrink-0 text-[length:var(--text-2xs)] font-medium"
                            style={{ color: m.status === "skipped" ? "var(--color-danger)" : "var(--color-warn)" }}
                          >
                            {STATUS_LABELS[m.status]}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{m.title}</span>
                          <span className="shrink-0 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                            {formatShortDate(m.date)}
                          </span>
                        </div>
                        {m.reason && (
                          <p className="truncate text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">{m.reason}</p>
                        )}
                      </li>
                    ))}
                    {focus.missed.length > 4 && <Muted>+{focus.missed.length - 4} daha</Muted>}
                  </ul>
                )}
                {focus.topics.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[length:var(--text-2xs)] uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
                      Sık eksik konular
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {focus.topics.map((t) => (
                        <li
                          key={t.topic}
                          className="inline-flex h-6 items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-2 text-[length:var(--text-sm)]"
                        >
                          {t.topic}
                          {t.count > 1 && (
                            <span className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">×{t.count}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* 4. Hızlı eylem */}
          <Card as="section" aria-label="Yarına görev ekle">
            <SectionTitle
              trailing={
                <Link href="/koc/planlama" className="text-[length:var(--text-sm)] text-[var(--color-accent)] hover:underline">
                  Planlama →
                </Link>
              }
            >
              Yarına görev ekle
            </SectionTitle>
            <Muted className="mt-1">
              {formatShortDate(tomorrow)} · şu an {tomorrowCount} görev
            </Muted>
            <div className="mt-2">
              <TaskQuickAdd
                dueDate={tomorrow}
                pending={createTask.isPending}
                onAdd={(title) => createTask.mutate({ title, dueDate: tomorrow, note: null })}
              />
            </div>
          </Card>
        </div>
      )}

      <Toast message={toast.message} variant={toast.variant} token={toast.token} onDismiss={toast.dismiss} />
    </ScreenBody>
  );
}

const STATE_ICON: Record<BoardState, { glyph: string; color: string; label: string }> = {
  done: { glyph: "✓", color: "var(--color-good)", label: "Tamamlandı" },
  partial: { glyph: "◐", color: "var(--color-warn)", label: "Yarım kaldı" },
  skipped: { glyph: "✗", color: "var(--color-danger)", label: "Yapılmadı" },
  pending: { glyph: "○", color: "var(--color-ink-3)", label: "Henüz girilmedi" },
};

function StateIcon({ state }: { state: BoardState }) {
  const { glyph, color, label } = STATE_ICON[state];
  return (
    <span role="img" aria-label={label} title={label} style={{ color }} className="w-4 shrink-0 text-center font-semibold">
      {glyph}
    </span>
  );
}

function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[length:var(--text-sm)] text-[var(--color-ink-3)] ${className ?? ""}`}>{children}</p>
  );
}

function Percent({ done, total }: { done: number; total: number }) {
  if (total === 0) return <span className="text-[var(--color-ink-3)]">—</span>;
  const ratio = done / total;
  return (
    <span
      className="text-[length:var(--text-lg)] font-semibold tabular-nums"
      style={{ color: TONE_COLOR[completionTone(ratio)] }}
    >
      %{Math.round(ratio * 100)}
    </span>
  );
}

function Bar({ done, total }: { done: number; total: number }) {
  const ratio = total === 0 ? 0 : done / total;
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]" aria-hidden>
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.round(ratio * 100)}%`, background: TONE_COLOR[completionTone(ratio)] }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--color-surface-2)] px-1 py-1.5">
      <dt className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">{label}</dt>
      <dd className="text-[length:var(--text-sm)] font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * Gün gün: üstte tamamlanma hücresi (renk = ton), altında plan (soluk)
 * ve gerçek (dolu) süre çubukları. Yükseklikler haftanın en büyük
 * değerine göre.
 */
function WeekBars({ days, today }: { days: readonly CoachDay[]; today: string }) {
  const max = Math.max(60, ...days.flatMap((d) => [d.plannedMinutes, d.actualMinutes]));
  return (
    <div className="mt-3 grid grid-cols-7 gap-1.5" role="list" aria-label="Gün gün">
      {days.map((d) => {
        const future = d.date > today;
        const ratio = d.total === 0 ? null : d.done / d.total;
        const label = `${formatShortDate(d.date)}: ${d.done}/${d.total} görev, plan ${formatMinutesShort(d.plannedMinutes)}, gerçek ${formatMinutesShort(d.actualMinutes)}`;
        return (
          <div key={d.date} role="listitem" aria-label={label} title={label} className="flex flex-col items-center gap-1">
            <div
              className="h-5 w-full rounded"
              style={{
                background:
                  ratio === null || future
                    ? "var(--color-surface-2)"
                    : `color-mix(in oklch, ${TONE_COLOR[completionTone(ratio)]} ${30 + Math.round(ratio * 60)}%, transparent)`,
              }}
            />
            <div className="flex h-14 w-full items-end justify-center gap-0.5">
              <div
                className="w-2 rounded-t bg-[var(--color-line-2)]"
                style={{ height: `${(d.plannedMinutes / max) * 100}%` }}
              />
              <div
                className="w-2 rounded-t bg-[var(--color-accent)]"
                style={{ height: `${(d.actualMinutes / max) * 100}%` }}
              />
            </div>
            <span
              className={`text-[length:var(--text-2xs)] ${d.date === today ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink-3)]"}`}
            >
              {WEEKDAYS_MIN[isoWeekday(d.date)]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
