"use client";

import { useState } from "react";
import { hasResultContent, resultSummary } from "@/features/results/format";
import { ResultDetail, ResultIcon } from "@/features/results/ResultDetails";
import { STATUS_LABELS } from "@/features/results/types";
import type { Task } from "@/features/tasks/types";
import { useStudentData } from "./StudentDataProvider";

/**
 * Planlama kartında öğrencinin sonucu: tek satır özet, tıklayınca
 * detay. SALT OKUNUR — koç sonucu düzenleyemez (RLS de izin vermez).
 */
export function CoachResultLine({ task }: { task: Task }) {
  const data = useStudentData();
  const [open, setOpen] = useState(false);
  if (!data) return null;

  const studentAdded = Boolean(task.createdBy && task.createdBy === data.studentId);
  const all = (data.resultsByTask.get(task.id) ?? []).filter(hasResultContent);
  // Görevin kendi günündeki sonuç önde; yoksa en yenisi.
  const main = all.find((r) => r.date === task.dueDate) ?? all[0];

  if (!main && !studentAdded) return null;

  return (
    <div className="mt-1 flex flex-col gap-1 text-[length:var(--text-2xs)]">
      <div className="flex flex-wrap items-center gap-1.5">
        {studentAdded && (
          <span className="rounded-full border border-[var(--color-line-2)] px-1.5 text-[var(--color-ink-3)]">
            öğrenci ekledi
          </span>
        )}
        {main && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex min-w-0 items-center gap-1 rounded px-1 text-left text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
          >
            <ResultIcon status={main.status} />
            <span className="truncate">
              {resultSummary(main) || (main.status ? STATUS_LABELS[main.status] : "Not var")}
            </span>
          </button>
        )}
      </div>

      {open && main && (
        <div className="rounded-md bg-[var(--color-surface-2)] p-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {all.map((r) => (
            <ResultDetail key={r.date} result={r} showDate={all.length > 1 || r.date !== task.dueDate} />
          ))}
        </div>
      )}
    </div>
  );
}
