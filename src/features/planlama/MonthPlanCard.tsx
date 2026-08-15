"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { slotVar } from "@/lib/ui/colors";
import { MonthPlanForm } from "./MonthPlanForm";
import type { MonthPlan, MonthPlanDraft } from "./types";

interface MonthPlanCardProps {
  plan: MonthPlan;
  pending: boolean;
  onUpdate: (draft: MonthPlanDraft) => void;
  onDelete: () => void;
}

/**
 * Tek bir genel planlama notu.
 *
 * `GoalCard`'ın sadeleşmiş hâli: aynı kart kabuğu, aynı tıkla-düzenle
 * etkileşimi, aynı renk noktası — ama ilerleme çubuğu ve arşiv düğmesi
 * YOK. Not ölçülmez ve hiçbir özete girmez; o iki kontrolü taşımak,
 * kartta hiçbir zaman anlam kazanmayan boş yapı bırakmak olurdu.
 *
 * Gövde `whitespace-pre-wrap` ile çizilir: kullanıcı satır satır
 * yazdığında (madde listesi gibi) o satırlar korunmalı. Tek paragrafa
 * ezmek, yazdığından farklı bir şey göstermek olurdu.
 */
export function MonthPlanCard({
  plan,
  pending,
  onUpdate,
  onDelete,
}: MonthPlanCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <li className="rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-3.5">
        <MonthPlanForm
          month={plan.month}
          initial={plan}
          sortOrder={plan.sortOrder}
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
        {/* Kimlik rengi; ad zaten yazıyla görünüyor. */}
        <span
          aria-hidden
          className="mt-1.5 size-2.5 shrink-0 rounded-full"
          style={{ background: slotVar(plan.colorSlot) }}
        />

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`${plan.title}: düzenle`}
            className="text-left text-[length:var(--text-base)] font-medium hover:text-[var(--color-accent)]"
          >
            {plan.title}
          </button>

          {plan.body && (
            <p className="mt-1 whitespace-pre-wrap text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
              {plan.body}
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          aria-label={`${plan.title}: sil`}
        >
          Sil
        </Button>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={`"${plan.title}" silinsin mi?`}
          description="Bu not kalıcı olarak silinir."
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
