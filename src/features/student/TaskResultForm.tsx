"use client";

import { useState, type KeyboardEvent } from "react";
import { Field, TextArea, TextInput } from "@/components/Field";
import { formatNet, resultNet } from "@/features/results/format";
import { STATUS_LABELS, type TaskResultInput, type TaskResultStatus } from "@/features/results/types";
import { cn } from "@/lib/ui/cn";
import type { SaveStatus } from "@/lib/ui/useAutosave";
import { SaveIndicator } from "./SaveIndicator";
import { addTopics } from "./topics";

const STATUSES: TaskResultStatus[] = ["done", "partial", "skipped"];

const STATUS_TONE: Record<TaskResultStatus, string> = {
  done: "var(--color-good)",
  partial: "var(--color-warn)",
  skipped: "var(--color-danger)",
};

function toInt(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1000) : null;
}

/**
 * Görevin sonuç giriş alanı. Otomatik kaydedilir. Bütün alanlar
 * opsiyonel: her görev soru görevi değil, her gün her şey yazılmaz.
 */
export function TaskResultForm({
  draft,
  update,
  flush,
  status,
  questionTask,
  disabled,
}: {
  draft: TaskResultInput;
  /** Taslağı değiştir ve kaydı planla; `immediate` → hemen gönder. */
  update: (patch: Partial<TaskResultInput>, immediate?: boolean) => void;
  flush: () => void;
  status: SaveStatus;
  /** Soru alanları açık mı başlasın. */
  questionTask: boolean;
  disabled: boolean;
}) {
  const [topicInput, setTopicInput] = useState("");
  const [showQuestions, setShowQuestions] = useState(
    questionTask || draft.correct !== null || draft.total !== null,
  );
  const autosave = { flush, status };

  function commitTopics() {
    if (!topicInput.trim()) return;
    update({ missingTopics: addTopics(draft.missingTopics, topicInput) }, true);
    setTopicInput("");
  }

  function onTopicKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTopics();
    } else if (e.key === "Backspace" && topicInput === "" && draft.missingTopics.length > 0) {
      update({ missingTopics: draft.missingTopics.slice(0, -1) }, true);
    }
  }

  const net = resultNet(draft);
  const needsReason = draft.status === "partial" || draft.status === "skipped";
  const answered = (draft.correct ?? 0) + (draft.wrong ?? 0) + (draft.empty ?? 0);
  const overTotal = draft.total !== null && answered > draft.total;

  return (
    <fieldset disabled={disabled} className="mt-3 flex flex-col gap-3 border-t border-[var(--color-line)] pt-3">
      <legend className="sr-only">Sonuç</legend>

      <div role="radiogroup" aria-label="Durum" className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const active = draft.status === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => update({ status: active ? null : s }, true)}
              className={cn(
                "h-8 rounded-full border px-3 text-[length:var(--text-sm)] font-medium transition-colors duration-[var(--duration-fast)] disabled:opacity-50",
                active ? "text-[var(--color-ink)]" : "border-[var(--color-line-2)] text-[var(--color-ink-2)]",
              )}
              style={
                active
                  ? {
                      borderColor: STATUS_TONE[s],
                      background: `color-mix(in oklch, ${STATUS_TONE[s]} 16%, transparent)`,
                    }
                  : undefined
              }
            >
              {STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {needsReason && (
        <Field label={draft.status === "partial" ? "Neden yarım kaldı?" : "Neden yapılmadı?"}>
          {(p) => (
            <TextInput
              {...p}
              size="sm"
              maxLength={500}
              placeholder="Kısa bir sebep"
              value={draft.reason ?? ""}
              onChange={(e) => update({ reason: e.target.value || null })}
              onBlur={() => autosave.flush()}
            />
          )}
        </Field>
      )}

      {showQuestions ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">Soru sonucu</span>
            <span className="text-[length:var(--text-sm)] font-medium tabular-nums text-[var(--color-ink)]">
              {net === null ? "— net" : `${formatNet(net)} net`}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ["total", "Toplam"],
                ["correct", "Doğru"],
                ["wrong", "Yanlış"],
                ["empty", "Boş"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                {(p) => (
                  <TextInput
                    {...p}
                    size="sm"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="text-center tabular-nums"
                    value={draft[key] ?? ""}
                    onChange={(e) => update({ [key]: toInt(e.target.value) })}
                    onBlur={() => autosave.flush()}
                  />
                )}
              </Field>
            ))}
          </div>
          {overTotal && (
            <p className="text-[length:var(--text-2xs)] text-[var(--color-warn)]">
              D + Y + B ({answered}) toplamdan ({draft.total}) fazla.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowQuestions(true)}
          className="self-start text-[length:var(--text-sm)] text-[var(--color-accent)] hover:underline disabled:opacity-50"
        >
          + Soru sonucu ekle
        </button>
      )}

      <Field label="Gerçek süre (dk)" className="max-w-40">
        {(p) => (
          <TextInput
            {...p}
            size="sm"
            inputMode="numeric"
            pattern="[0-9]*"
            className="tabular-nums"
            value={draft.actualMinutes ?? ""}
            onChange={(e) => {
              const n = toInt(e.target.value);
              update({ actualMinutes: n === null ? null : Math.min(n, 1440) });
            }}
            onBlur={() => autosave.flush()}
          />
        )}
      </Field>

      <Field label="Eksik / takıldığım konular" hint="Virgül ya da Enter ile ekle">
        {(p) => (
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface-2)] p-1.5">
            {draft.missingTopics.map((t) => (
              <span
                key={t}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-[var(--color-surface-3)] pl-2.5 pr-1 text-[length:var(--text-sm)]"
              >
                {t}
                <button
                  type="button"
                  aria-label={`${t} konusunu kaldır`}
                  onClick={() =>
                    update({ missingTopics: draft.missingTopics.filter((x) => x !== t) }, true)
                  }
                  className="grid size-5 place-items-center rounded-full text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              {...p}
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={onTopicKey}
              onBlur={commitTopics}
              placeholder={draft.missingTopics.length === 0 ? "ör. Üslü sayılarda negatif kuvvet" : ""}
              className="h-7 min-w-32 flex-1 bg-transparent px-1 text-[length:var(--text-sm)] outline-none placeholder:text-[var(--color-ink-3)]"
            />
          </div>
        )}
      </Field>

      <Field label="Not">
        {(p) => (
          <TextArea
            {...p}
            rows={2}
            maxLength={2000}
            value={draft.note ?? ""}
            onChange={(e) => update({ note: e.target.value || null })}
            onBlur={() => autosave.flush()}
            className="text-[length:var(--text-sm)]"
          />
        )}
      </Field>

      <SaveIndicator status={autosave.status} className="self-end" />
    </fieldset>
  );
}
