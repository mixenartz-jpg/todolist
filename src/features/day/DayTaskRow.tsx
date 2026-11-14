"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/Button";
import { Field, TextInput } from "@/components/Field";
import { ReorderButtons } from "@/features/planlama/ReorderButtons";
import { hasResultContent, resultSummary } from "@/features/results/format";
import { emptyResult } from "@/features/results/mutations";
import { ResultDetail } from "@/features/results/ResultDetails";
import { STATUS_LABELS, type TaskResult, type TaskResultInput } from "@/features/results/types";
import { looksLikeQuestionTask } from "@/features/student/topics";
import { formatEstimate, parseEstimateInput } from "@/features/tasks/estimate";
import type { Task } from "@/features/tasks/types";
import { isDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { useAutosave } from "@/lib/ui/useAutosave";
import type { DayMode } from "./days";
import { TaskResultForm } from "./TaskResultForm";

/** Koç kipinde satırın yapabildikleri (Planlama'nın görev eylemleri). */
export interface CoachTaskControls {
  onToggle: (task: Task) => void;
  onRename: (task: Task, title: string) => void;
  onSetEstimate: (task: Task, minutes: number | null) => void;
  onDelete: (task: Task) => void;
  onMove: (task: Task, date: DateStr) => void;
  onReorder: (task: Task, delta: -1 | 1) => void;
}

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
 * Günün görev satırı — öğrenci ekranı ve koçun Gün görünümü AYNI satırı
 * kullanır, `mode` davranışı seçer:
 *   student: checkbox ve sonuç formu öğrencinin (başlık/süre salt okunur)
 *   preview: aynı görünüm, her şey kapalı
 *   coach:   başlık/süre/sıra/gün düzenlenir; sonuç salt okunur
 */
export function DayTaskRow({
  mode,
  task,
  date,
  result,
  editable,
  onSave,
  coach,
  position,
}: {
  mode: DayMode;
  task: Task;
  date: DateStr;
  result: TaskResult | undefined;
  /** Öğrenci kipinde: gün düzenlenebilir mi (geçmiş/bugün). */
  editable: boolean;
  onSave: (input: TaskResultInput) => Promise<unknown>;
  coach?: CoachTaskControls;
  /** Koç sıralaması için listedeki yer. */
  position?: { isFirst: boolean; isLast: boolean };
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

  const isCoach = mode === "coach" && coach !== undefined;
  /*
   * Öğrencide: durum seçilmişse o geçerli, değilse görevin `done`'ı
   * (koç işaretlemiş olabilir). Koçta: görevin kendi durumu.
   */
  const done = isCoach
    ? task.done
    : draft.status !== null
      ? draft.status === "done"
      : task.done;
  const checkboxEnabled = isCoach || (mode === "student" && editable);

  const summaryText = result ? resultSummary(result) : "";
  const showSummary = !open && result && hasResultContent(result);

  function toggle() {
    if (isCoach) {
      coach.onToggle(task);
      return;
    }
    update({ status: done ? null : "done" }, true);
    if (!done) setOpen(true);
  }

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
          disabled={!checkboxEnabled}
          onClick={toggle}
          aria-pressed={done}
          aria-label={done ? `${task.title}: geri al` : `${task.title}: tamamla`}
          className="-mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg active:scale-[0.97] disabled:cursor-default"
        >
          <span
            className={cn(
              "grid size-[22px] place-items-center rounded-md transition-colors",
              done ? "bg-[var(--color-accent)]" : "border-[1.5px] border-[var(--color-line-2)]",
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
            {showSummary && (
              <span className="mt-1 block text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                {result.status && result.status !== "done" ? STATUS_LABELS[result.status] : ""}
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
          {isCoach ? (
            <CoachTaskPanel task={task} date={date} result={result} coach={coach} position={position} />
          ) : (
            <TaskResultForm
                draft={draft}
                update={update}
                flush={autosave.flush}
                status={autosave.status}
                questionTask={looksLikeQuestionTask(task.title)}
                disabled={!(mode === "student" && editable)}
              />
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Koçun görev paneli: planı düzenler, öğrencinin sonucunu yalnızca
 * gösterir.
 */
function CoachTaskPanel({
  task,
  date,
  result,
  coach,
  position,
}: {
  task: Task;
  date: DateStr;
  result: TaskResult | undefined;
  coach: CoachTaskControls;
  position?: { isFirst: boolean; isLast: boolean };
}) {
  const [title, setTitle] = useState(task.title);
  const [estimate, setEstimate] = useState(task.estimateMinutes ? formatEstimate(task.estimateMinutes) : "");
  const [moveTo, setMoveTo] = useState<string>(date);

  function commitTitle() {
    const next = title.trim();
    if (next && next !== task.title) coach.onRename(task, next);
    else setTitle(task.title);
  }

  function commitEstimate() {
    const minutes = estimate.trim() === "" ? null : parseEstimateInput(estimate);
    if (estimate.trim() !== "" && minutes === null) {
      setEstimate(task.estimateMinutes ? formatEstimate(task.estimateMinutes) : "");
      return;
    }
    if (minutes !== task.estimateMinutes) coach.onSetEstimate(task, minutes);
  }

  const onEnter = (fn: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-[var(--color-line)] pt-3">
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <Field label="Başlık">
          {(p) => (
            <TextInput
              {...p}
              size="sm"
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={onEnter(commitTitle)}
            />
          )}
        </Field>
        <Field label="Süre">
          {(p) => (
            <TextInput
              {...p}
              size="sm"
              placeholder="ör. 1,5 sa"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              onBlur={commitEstimate}
              onKeyDown={onEnter(commitEstimate)}
            />
          )}
        </Field>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Başka güne taşı">
          {(p) => (
            <div className="w-40">
              <TextInput {...p} type="date" size="sm" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} />
            </div>
          )}
        </Field>
        <Button
          size="sm"
          variant="secondary"
          disabled={!isDateStr(moveTo) || moveTo === date}
          onClick={() => isDateStr(moveTo) && coach.onMove(task, moveTo)}
        >
          Taşı
        </Button>
        <span className="flex-1" />
        {position && (
          <ReorderButtons
            title={task.title}
            isFirst={position.isFirst}
            isLast={position.isLast}
            onMove={(delta) => coach.onReorder(task, delta)}
            className=""
          />
        )}
        <Button size="sm" variant="danger" onClick={() => coach.onDelete(task)}>
          Sil
        </Button>
      </div>

      <div>
        <p className="mb-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">Öğrencinin sonucu</p>
        {result && hasResultContent(result) ? (
          <div className="rounded-md bg-[var(--color-surface-2)] p-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            <ResultDetail result={result} showDate={false} />
          </div>
        ) : (
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Sonuç girilmedi.</p>
        )}
      </div>
    </div>
  );
}
