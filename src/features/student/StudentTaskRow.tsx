"use client";

import { useState } from "react";
import { formatEstimate } from "@/features/tasks/estimate";
import type { Task } from "@/features/tasks/types";
import { hasResultContent, resultSummary } from "@/features/results/format";
import { STATUS_LABELS, type TaskResult, type TaskResultInput } from "@/features/results/types";
import { emptyResult } from "@/features/results/mutations";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { useAutosave } from "@/lib/ui/useAutosave";
import { TaskResultForm } from "./TaskResultForm";
import { looksLikeQuestionTask } from "./topics";

function inputFrom(task: Task, date: DateStr, r: TaskResult | undefined): TaskResultInput {
  if (!r) return emptyResult(task.id, date);
  return {
    taskId: r.taskId,
    date: r.date,
    status: r.status,
    total: r.total,
    correct: r.correct,
    wrong: r.wrong,
    empty: r.empty,
    actualMinutes: r.actualMinutes,
    missingTopics: r.missingTopics,
    reason: r.reason,
    note: r.note,
  };
}

/**
 * Öğrencinin görev satırı. Başlık ve süre SALT OKUNUR (koçun planı).
 * Checkbox durumu "Tamamlandı" yapar/kaldırır; satıra dokununca sonuç
 * formu açılır. Checkbox ve form AYNI taslağı paylaşır — biri
 * diğerinin kaydını ezmesin.
 */
export function StudentTaskRow({
  task,
  date,
  result,
  editable,
  studentAdded,
  onSave,
  onDelete,
}: {
  task: Task;
  date: DateStr;
  result: TaskResult | undefined;
  editable: boolean;
  /** Öğrencinin kendi eklediği "ek çalışma". */
  studentAdded: boolean;
  onSave: (input: TaskResultInput) => Promise<unknown>;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => inputFrom(task, date, result));
  const autosave = useAutosave(onSave);

  function update(patch: Partial<TaskResultInput>, immediate = false) {
    const next = { ...draft, ...patch };
    setDraft(next);
    autosave.schedule(next);
    if (immediate) autosave.flush();
  }

  /*
   * Durum seçilmemişse görevin kendi `done`'ı geçerli (koç işaretlemiş
   * ya da sonuç tablosundan önce bitmiş olabilir). Böylece checkbox ile
   * üstteki yüzde aynı şeyi söyler.
   */
  const done = draft.status !== null ? draft.status === "done" : task.done;
  const summaryText = result ? resultSummary(result) : "";
  const showSummary = !open && result && hasResultContent(result);

  return (
    <li
      className={cn(
        "rounded-xl border p-2 pr-3 transition-colors duration-[var(--duration-fast)]",
        done
          ? "border-transparent bg-[var(--color-surface-2)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)]",
      )}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          disabled={!editable}
          onClick={() => {
            update({ status: done ? null : "done" }, true);
            if (!done) setOpen(true);
          }}
          aria-pressed={done}
          aria-label={done ? `${task.title}: geri al` : `${task.title}: tamamla`}
          className="-mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg active:scale-[0.97] disabled:cursor-default"
        >
          <span
            className={cn(
              "grid size-[22px] place-items-center rounded-md transition-colors",
              done
                ? "bg-[var(--color-accent)]"
                : "border-[1.5px] border-[var(--color-line-2)]",
            )}
          >
            {done && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M2.5 6.2l2.4 2.4L9.5 4"
                  stroke="var(--color-on-accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start gap-2 py-2 text-left"
        >
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block text-[length:var(--text-base)] leading-snug",
                done && "text-[var(--color-ink-3)] line-through",
              )}
            >
              {task.title}
            </span>
            {studentAdded && (
              <span className="mt-1 inline-block rounded-full border border-[var(--color-line-2)] px-2 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                öğrenci ekledi
              </span>
            )}
            {showSummary && (
              <span className="mt-1 block text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                {result.status && result.status !== "done" ? `${STATUS_LABELS[result.status]}` : ""}
                {result.status && result.status !== "done" && summaryText ? " · " : ""}
                {summaryText}
              </span>
            )}
          </span>
          {task.estimateMinutes !== null && (
            <span className="shrink-0 rounded-full border border-[var(--color-line-2)] px-2 py-0.5 text-[length:var(--text-2xs)] font-medium tabular-nums text-[var(--color-ink-2)]">
              {formatEstimate(task.estimateMinutes)}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="pl-11">
          <TaskResultForm
            draft={draft}
            update={update}
            flush={autosave.flush}
            status={autosave.status}
            questionTask={looksLikeQuestionTask(task.title)}
            disabled={!editable}
          />
          {studentAdded && editable && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="mt-2 text-[length:var(--text-sm)] text-[var(--color-danger)] hover:underline"
            >
              Ek çalışmayı sil
            </button>
          )}
        </div>
      )}
    </li>
  );
}
