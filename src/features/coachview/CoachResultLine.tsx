"use client";

import { useState } from "react";
import { EarlyBadge } from "@/features/day/DayTaskRow";
import { earlyDoneOn } from "@/features/results/early";
import { hasResultContent, resultSummary } from "@/features/results/format";
import { ResultDetail, ResultIcon } from "@/features/results/ResultDetails";
import { STATUS_LABELS } from "@/features/results/types";
import type { Task } from "@/features/tasks/types";
import { useSourceUnits } from "@/features/sources/queries";
import { progressLine } from "@/features/sources/title";
import { useStudentData } from "./StudentDataProvider";

/**
 * Planlama kartında öğrencinin sonucu: tek satır özet, tıklayınca
 * detay. SALT OKUNUR — koç sonucu düzenleyemez (RLS de izin vermez).
 */
export function CoachResultLine({ task }: { task: Task }) {
  const data = useStudentData();
  const [open, setOpen] = useState(false);
  const units = useSourceUnits();
  if (!data) return null;
  const unit = (task.sourceId && units.data?.get(task.sourceId)) || "sayfa";

  const all = (data.resultsByTask.get(task.id) ?? []).filter(hasResultContent);
  // Görevin kendi günündeki sonuç önde; yoksa en yenisi.
  const main = all.find((r) => r.date === task.dueDate) ?? all[0];

  if (!main) return null;
  const early = earlyDoneOn(main);

  return (
    <div className="mt-1 flex flex-col gap-1 text-[length:var(--text-2xs)]">
      <div className="flex flex-wrap items-center gap-1.5">
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
        {early && <EarlyBadge doneOn={early} />}
      </div>

      {open && main && (
        <div className="rounded-md bg-[var(--color-surface-2)] p-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {all.map((r) => (
            <ResultDetail
              key={r.date}
              result={r}
              showDate={all.length > 1 || r.date !== task.dueDate}
              progress={r === main ? progressLine(task, r, unit) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
