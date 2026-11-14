"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Field, SelectInput, TextArea } from "@/components/Field";
import { SectionTitle } from "@/components/SectionTitle";
import {
  ENERGY_LABELS,
  SCREEN_BUCKETS,
  SLEEP_OPTIONS,
  STUDY_BUCKETS,
  WAKE_OPTIONS,
} from "@/features/results/buckets";
import type { DailyLog, DailyLogInput } from "@/features/results/types";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { useAutosave } from "@/lib/ui/useAutosave";
import { SaveIndicator } from "./SaveIndicator";

function draftFrom(date: DateStr, log: DailyLog | undefined): DailyLogInput {
  return {
    date,
    sleepAt: log?.sleepAt ?? null,
    wakeAt: log?.wakeAt ?? null,
    studyBucket: log?.studyBucket ?? null,
    screenBucket: log?.screenBucket ?? null,
    energy: log?.energy ?? null,
    note: log?.note ?? null,
  };
}

/** Kayıtlı değer listede yoksa (eski veri) yine de seçenek olarak göster. */
function withValue(options: readonly string[], value: string | null): string[] {
  return value && !options.includes(value) ? [value, ...options] : [...options];
}

const LABEL = "text-[length:var(--text-sm)] text-[var(--color-ink-2)]";

/**
 * Günlük form. Ayrı "Kaydet" düğmesi yok: her değişiklik 800 ms sonra
 * kaydedilir. Bileşen gün değişince yeniden takılır (`key={date}`),
 * böylece taslak her zaman o günün kaydından doğar.
 */
export function DailyLogForm({
  date,
  log,
  disabled,
  onSave,
}: {
  date: DateStr;
  log: DailyLog | undefined;
  disabled: boolean;
  onSave: (input: DailyLogInput) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<DailyLogInput>(() => draftFrom(date, log));
  const autosave = useAutosave(onSave);

  function update(patch: Partial<DailyLogInput>, immediate = false) {
    const next = { ...draft, ...patch };
    setDraft(next);
    autosave.schedule(next);
    if (immediate) autosave.flush();
  }

  const numberOrNull = (v: string) => (v === "" ? null : Number(v));

  return (
    <Card as="section" aria-label="Günlük form">
      <SectionTitle level={2} trailing={<SaveIndicator status={autosave.status} />}>
        Günlük form
      </SectionTitle>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Uyuma">
          {(p) => (
            <SelectInput
              {...p}
              size="sm"
              disabled={disabled}
              value={draft.sleepAt ?? ""}
              onChange={(e) => update({ sleepAt: e.target.value || null }, true)}
            >
              <option value="">Seçiniz</option>
              {withValue(SLEEP_OPTIONS, draft.sleepAt).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SelectInput>
          )}
        </Field>

        <Field label="Uyanma">
          {(p) => (
            <SelectInput
              {...p}
              size="sm"
              disabled={disabled}
              value={draft.wakeAt ?? ""}
              onChange={(e) => update({ wakeAt: e.target.value || null }, true)}
            >
              <option value="">Seçiniz</option>
              {withValue(WAKE_OPTIONS, draft.wakeAt).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SelectInput>
          )}
        </Field>

        <Field label="Günlük çalışma" className="col-span-2">
          {(p) => (
            <SelectInput
              {...p}
              size="sm"
              disabled={disabled}
              value={draft.studyBucket ?? ""}
              onChange={(e) => update({ studyBucket: numberOrNull(e.target.value) }, true)}
            >
              <option value="">Seçiniz</option>
              {STUDY_BUCKETS.map((label, i) => (
                <option key={label} value={i}>{label}</option>
              ))}
            </SelectInput>
          )}
        </Field>

        <Field label="Ekran süresi" className="col-span-2">
          {(p) => (
            <SelectInput
              {...p}
              size="sm"
              disabled={disabled}
              value={draft.screenBucket ?? ""}
              onChange={(e) => update({ screenBucket: numberOrNull(e.target.value) }, true)}
            >
              <option value="">Seçiniz</option>
              {SCREEN_BUCKETS.map((label, i) => (
                <option key={label} value={i}>{label}</option>
              ))}
            </SelectInput>
          )}
        </Field>

        <fieldset className="col-span-2 flex flex-col gap-1.5" disabled={disabled}>
          <legend className={cn(LABEL, "mb-1.5")}>Enerji / odak</legend>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = draft.energy === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={active}
                  title={ENERGY_LABELS[n]}
                  onClick={() => update({ energy: active ? null : n }, true)}
                  className={cn(
                    "h-9 flex-1 rounded-md border text-[length:var(--text-sm)] font-medium tabular-nums",
                    "transition-colors duration-[var(--duration-fast)] disabled:opacity-50",
                    active
                      ? "border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_16%,transparent)] text-[var(--color-ink)]"
                      : "border-[var(--color-line-2)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)]",
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {draft.energy !== null && (
            <span className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
              {ENERGY_LABELS[draft.energy]}
            </span>
          )}
        </fieldset>

        <Field label="Notlar" className="col-span-2">
          {(p) => (
            <TextArea
              {...p}
              rows={4}
              disabled={disabled}
              maxLength={4000}
              placeholder="Günüm nasıl geçti, deneme sonucu, genel sorunlar…"
              value={draft.note ?? ""}
              onChange={(e) => update({ note: e.target.value || null })}
              onBlur={() => autosave.flush()}
              className="text-[length:var(--text-sm)]"
            />
          )}
        </Field>
      </div>
    </Card>
  );
}
