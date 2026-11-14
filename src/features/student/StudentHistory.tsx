"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";
import { SkeletonList } from "@/components/Skeleton";
import { completionTone, TONE_COLOR } from "@/features/results/format";
import { useCoachNotes, useDailyLogs, useTaskResults } from "@/features/results/queries";
import { useTasks } from "@/features/tasks/queries";
import { addDays, todayStr } from "@/lib/date/date";
import { useViewer } from "@/lib/auth/ViewerProvider";
import { chipLabel } from "@/features/day/days";
import { dayRecords } from "./history";

const HISTORY_DAYS = 30;

/**
 * Son 30 günün listesi: yüzde, yapılmayanlar, form dolu mu, koç notu.
 * Satır o günün Bugün ekranını açar (koçta salt okunur önizleme).
 */
export function StudentHistory({ title = "Geçmiş günler" }: { title?: string }) {
  const viewer = useViewer();
  const today = todayStr();
  const from = addDays(today, -(HISTORY_DAYS - 1));
  const studentId = viewer.studentId;

  const tasksQuery = useTasks();
  const resultsQuery = useTaskResults(studentId, from, today);
  const logsQuery = useDailyLogs(studentId, from, today);
  const notesQuery = useCoachNotes(studentId, from, today);

  const records = useMemo(
    () =>
      dayRecords(
        tasksQuery.data ?? [],
        resultsQuery.data ?? [],
        logsQuery.data ?? [],
        notesQuery.data ?? [],
        from,
        today,
      ),
    [tasksQuery.data, resultsQuery.data, logsQuery.data, notesQuery.data, from, today],
  );

  const loading = tasksQuery.isPending || (studentId !== null && resultsQuery.isPending);

  return (
    <Card as="section" aria-label={title}>
      <SectionTitle level={2}>{title}</SectionTitle>
      {studentId === null ? (
        <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Bağlı öğrenci yok.</p>
      ) : loading ? (
        <SkeletonList count={5} height={44} className="mt-3" />
      ) : records.length === 0 ? (
        <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Son 30 günde kayıt yok.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-[var(--color-line)]">
          {records.map((r) => {
            const ratio = r.total === 0 ? 0 : r.done / r.total;
            return (
              <li key={r.date}>
                <Link
                  href={r.date === today ? "/ogrenci/bugun" : `/ogrenci/bugun?gun=${r.date}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-[color-mix(in_oklch,var(--color-ink)_3%,transparent)]"
                >
                  <span className="w-24 shrink-0 text-[length:var(--text-sm)] font-medium">
                    {r.date === today ? "Bugün" : chipLabel(r.date)}
                  </span>
                  <span
                    className="w-12 shrink-0 text-right text-[length:var(--text-sm)] font-semibold tabular-nums"
                    style={{ color: r.total ? TONE_COLOR[completionTone(ratio)] : "var(--color-ink-3)" }}
                  >
                    {r.total ? `${Math.round(ratio * 100)}%` : "—"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                    {r.done}/{r.total} görev
                    {r.missed > 0 && ` · ${r.missed} yapılmadı/yarım`}
                  </span>
                  <span className="flex shrink-0 gap-1.5 text-[length:var(--text-2xs)]">
                    <span
                      className={r.formFilled ? "text-[var(--color-good)]" : "text-[var(--color-ink-4)]"}
                      title={r.formFilled ? "Günlük form dolu" : "Günlük form boş"}
                    >
                      Form {r.formFilled ? "✓" : "–"}
                    </span>
                    {r.hasCoachNote && <span className="text-[var(--color-accent)]">Not</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
