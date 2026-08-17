"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import { formatPercent } from "@/lib/ui/tr";
import { stepDoneCount } from "./goal";
import { WeekGoalForm } from "./WeekGoalForm";
import type { WeekGoal, WeekGoalDraft } from "./types";

interface WeekGoalCardProps {
  goal: WeekGoal;
  pending: boolean;
  onUpdate: (draft: WeekGoalDraft) => void;
  onStep: (doneCount: number) => void;
  onToggleDone: (done: boolean) => void;
  onDelete: () => void;
}

/**
 * Tek bir haftalık hedef.
 *
 * `GoalCard`'dan üç yerde ayrılır:
 *
 *   1. Başlığın solunda TAMAMLANDI KUTUSU. Aylık hedefte tamamlanma
 *      yalnızca sayaçtan okunuyordu; burada elle işaretlenebilir,
 *      çünkü haftalık hedeflerin çoğu sayaçsızdır ("sunumu hazırla").
 *
 *   2. İlerleme çubuğu YALNIZCA sayısal hedefte. Aylık kartın üçüncü
 *      hâli olan "bağlı görevlerden oku" burada yok — haftalık hedefe
 *      görev bağlanmıyor. Sayaçsız hedefte çubuk çizmek yerine hiçbir
 *      şey çizilmez: kutu zaten durumu söylüyor.
 *
 *   3. Arşiv düğmesi YOK. Tamamlanan hedef listede kalır (üstü çizili);
 *      arşiv "vazgeçtim" demenin yoluydu ve haftalık ölçekte bunun
 *      karşılığı hedefi silmektir — bir hafta zaten yedi gün sürer.
 */
export function WeekGoalCard({
  goal,
  pending,
  onUpdate,
  onStep,
  onToggleDone,
  onDelete,
}: WeekGoalCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const done = goal.completedAt !== null;
  const hasCount = goal.targetCount !== null;
  const ratio = hasCount
    ? Math.min(goal.doneCount / (goal.targetCount as number), 1)
    : null;

  if (editing) {
    return (
      <li className="rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-3.5">
        <WeekGoalForm
          weekStart={goal.weekStart}
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
    <li className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5">
      <div className="flex items-start gap-2.5">
        {/*
         * Kutu ve kimlik rengi tek bir öğede birleşti: işaretliyken
         * kutunun DOLGUSU hedefin rengi olur. Ayrı bir renk noktası
         * daha koymak, aynı bilgiyi iki kez çizmek olurdu.
         */}
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`${goal.title}: tamamlandı olarak işaretle`}
          onClick={() => onToggleDone(!done)}
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border",
            "transition-colors duration-[var(--duration-fast)]",
            done
              ? "border-transparent text-[var(--color-surface)]"
              // `--color-line-2`: girdi kenarı tonu. Kart kenarıyla
              // (`--color-line`) aynı olsaydı kutu, üzerinde durduğu
              // kartın içinde kaybolurdu.
              : "border-[var(--color-line-2)] hover:border-[var(--color-accent)]",
          )}
          style={done ? { background: slotVar(goal.colorSlot) } : undefined}
        >
          {done && (
            <svg
              viewBox="0 0 12 12"
              className="size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M2.5 6.5 5 9l4.5-5.5" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`${goal.title}: düzenle`}
            className={cn(
              "text-left text-[length:var(--text-base)] font-medium hover:text-[var(--color-accent)]",
              done && "weekGoalDone",
            )}
          >
            {goal.title}
          </button>

          {goal.note && (
            <p
              className={cn(
                "mt-1 text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]",
                done && "weekGoalDone",
              )}
            >
              {goal.note}
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          aria-label={`${goal.title}: sil`}
        >
          Sil
        </Button>
      </div>

      {/*
       * Sayaçsız hedefte bu blok HİÇ çizilmez. `GoalCard`'ın "henüz
       * ölçülmüyor" açıklaması buraya taşınmadı: orada o metin bir
       * eksikliği işaret ediyordu (ölçü tanımlanmamış), burada
       * sayaçsızlık geçerli ve yaygın bir seçim — her sayaçsız kartın
       * altına açıklama koymak listeyi gereksiz yere şişirirdi.
       */}
      {hasCount && (
        <div className="mt-3">
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
              {goal.doneCount} / {goal.targetCount}
            </span>

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
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`"${goal.title}" silinsin mi?`}
          description="Bu hedef kalıcı olarak silinir. Bitirdiysen silmek yerine kutucuğu işaretle — hafta sonunda neyi tamamladığını görürsün."
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
