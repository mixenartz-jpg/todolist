"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import { formatPercent } from "@/lib/ui/tr";
import { stepDoneCount } from "./goal";
import { GoalForm } from "./GoalForm";
import type { GoalProgress } from "./rollup";
import type { PlanGoalDraft } from "./types";

interface GoalCardProps {
  progress: GoalProgress;
  pending: boolean;
  onUpdate: (draft: PlanGoalDraft) => void;
  onStep: (doneCount: number) => void;
  onArchive: (archived: boolean) => void;
  onDelete: () => void;
}

/**
 * Tek bir aylık hedef.
 *
 * İlerleme çubuğu ÜÇ farklı şey söyleyebilir ve üçü de farklı çizilir:
 *
 *   count → "4 / 10" — kullanıcının elle işaretlediği sayaç
 *   tasks → "1 / 3 iş" — bağlı görevlerden okunan oran
 *   none  → çubuk YOK, "henüz ölçülmüyor" — %0 göstermek "hiç
 *           başlamadın" derdi, oysa doğrusu ölçü tanımlanmamış olması
 *
 * Bu ayrım `rollup.ts`'in `GoalProgress.source` alanında yaşıyor;
 * burada yalnızca okunuyor.
 */
export function GoalCard({
  progress,
  pending,
  onUpdate,
  onStep,
  onArchive,
  onDelete,
}: GoalCardProps) {
  const { goal, ratio, source, taskTotal, taskDone } = progress;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const archived = goal.archivedAt !== null;

  if (editing) {
    return (
      <li className="rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-3.5">
        <GoalForm
          month={goal.month}
          initial={goal}
          sortOrder={goal.sortOrder}
          pending={pending}
          onSubmit={(draft) => {
            onUpdate(draft);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li
      className={cn(
        "rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5",
        archived && "opacity-60",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Kimlik rengi; ad zaten yazıyla görünüyor. */}
        <span
          aria-hidden
          className="mt-1.5 size-2.5 shrink-0 rounded-full"
          style={{ background: slotVar(goal.colorSlot) }}
        />

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`${goal.title}: düzenle`}
            className="text-left text-[length:var(--text-base)] font-medium hover:text-[var(--color-accent)]"
          >
            {goal.title}
            {archived && (
              <span className="ml-1.5 text-[length:var(--text-2xs)] font-normal text-[var(--color-ink-3)]">
                arşivde
              </span>
            )}
          </button>

          {goal.note && (
            <p className="mt-1 text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
              {goal.note}
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onArchive(!archived)}
        >
          {archived ? "Geri al" : "Arşivle"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          aria-label={`${goal.title}: sil`}
        >
          Sil
        </Button>
      </div>

      <div className="mt-3">
        {source === "none" ? (
          /* Çubuk YOK. %0 çizmek "hiç başlamadın" derdi; doğrusu
             ölçünün henüz tanımlanmamış olması. */
          <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            Henüz ölçülmüyor — sayısal hedef yaz ya da bu hedefe görev
            bağla.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div
                className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((ratio ?? 0) * 100)}
                aria-label={`${goal.title} ilerlemesi`}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-expo)]"
                  style={{
                    width: `${(ratio ?? 0) * 100}%`,
                    background: slotVar(goal.colorSlot),
                  }}
                />
              </div>

              <span className="tabular shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
                {formatPercent(ratio ?? 0)}
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-2">
              <span className="tabular text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                {source === "count"
                  ? `${goal.doneCount} / ${goal.targetCount}`
                  : `${taskDone} / ${taskTotal} iş`}
              </span>

              {/* Elle sayaç YALNIZCA sayısal hedefte: görev bazlı
                  ilerleme görevlerin kendisinden okunur ve elle
                  oynatmak iki doğruluk kaynağı yaratırdı. */}
              {source === "count" && !archived && (
                <div className="ml-auto flex gap-0.5">
                  <StepButton
                    label={`${goal.title}: bir azalt`}
                    disabled={goal.doneCount <= 0}
                    onClick={() =>
                      onStep(stepDoneCount(goal.doneCount, -1, goal.targetCount))
                    }
                  >
                    −
                  </StepButton>
                  <StepButton
                    label={`${goal.title}: bir artır`}
                    disabled={goal.doneCount >= (goal.targetCount ?? 0)}
                    onClick={() =>
                      onStep(stepDoneCount(goal.doneCount, 1, goal.targetCount))
                    }
                  >
                    +
                  </StepButton>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={`"${goal.title}" silinsin mi?`}
          description="Bu hedefe bağlı görevler silinmez, hedefsiz olur. Geçmiş ay özetini korumak istiyorsan silmek yerine arşivle."
          confirmLabel="Sil"
          onConfirm={() => {
            onDelete();
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </li>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-md text-[length:var(--text-sm)]",
        "transition-colors duration-[var(--duration-fast)]",
        "text-[var(--color-ink-2)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink)]",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}
