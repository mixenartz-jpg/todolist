"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field, SelectInput, TextInput } from "@/components/Field";
import { formatEstimate, parseEstimateInput } from "@/features/tasks/estimate";
import { isDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { useAddTaskAction, useTaskActions } from "./actionQueries";
import { defaultAction, PROGRESS_ACTION } from "./actions";
import { newIds, useCreatePlannedTasks } from "./taskCreate";
import type { TaskPlan } from "./title";
import type { SourceKind } from "./types";

const NEW_ACTION = "__new__";

/**
 * "Güne ekle": tarih + eylem seç, başlıkları gör (düzenlenebilir), ekle.
 * Planlar çağıranın seçiminden (`build`) her değişiklikte yeniden
 * üretilir; elle düzeltilen başlık ve süre korunur.
 */
export function AddTasksForm({
  kind,
  build,
  defaultDate,
  fixedAction,
  onCreated,
  onCancel,
  onError,
  compact = false,
}: {
  kind: SourceKind;
  build: (action: string, dueDate: DateStr | null) => TaskPlan[];
  defaultDate: DateStr | null;
  /** İlerlet gibi eylemi kendisi belirleyen kip. */
  fixedAction?: string;
  onCreated?: (plans: TaskPlan[]) => void;
  onCancel?: () => void;
  onError?: (m: string) => void;
  compact?: boolean;
}) {
  const actions = useTaskActions();
  const addAction = useAddTaskAction(onError);
  const create = useCreatePlannedTasks(onError);
  const [date, setDate] = useState<string>(defaultDate ?? "");
  const [action, setAction] = useState(defaultAction(kind));
  const [newAction, setNewAction] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [estimates, setEstimates] = useState<Record<number, string>>({});

  const effectiveAction = fixedAction ?? action;
  const dueDate = isDateStr(date) ? date : null;
  const plans = build(effectiveAction, dueDate);
  const final = plans.map((p, i) => {
    const est = estimates[i];
    const minutes = est === undefined ? p.estimateMinutes : est.trim() === "" ? null : parseEstimateInput(est);
    return { ...p, title: titles[i]?.trim() || p.title, estimateMinutes: minutes ?? p.estimateMinutes };
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (final.length === 0 || !dueDate) return;
    create.mutate({ plans: final, ids: newIds(final.length) }, { onSuccess: () => onCreated?.(final) });
    setTitles({});
    setEstimates({});
  }

  const actionOptions = actions.filter((a) => a !== PROGRESS_ACTION);

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}>
        <Field label="Gün">
          {(p) => <TextInput {...p} size="sm" type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        {!fixedAction && (
          <Field label="Eylem">
            {(p) =>
              newAction !== null ? (
                <div className="flex gap-1">
                  <TextInput
                    {...p}
                    size="sm"
                    autoFocus
                    maxLength={40}
                    placeholder="Yeni eylem"
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newAction.trim()) {
                          addAction.mutate(newAction.trim());
                          setAction(newAction.trim());
                        }
                        setNewAction(null);
                      }
                      if (e.key === "Escape") setNewAction(null);
                    }}
                  />
                </div>
              ) : (
                <SelectInput
                  {...p}
                  size="sm"
                  value={action}
                  onChange={(e) => (e.target.value === NEW_ACTION ? setNewAction("") : setAction(e.target.value))}
                >
                  {actionOptions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                  <option value={NEW_ACTION}>+ Yeni eylem…</option>
                </SelectInput>
              )
            }
          </Field>
        )}
      </div>

      {final.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Önce birim seç.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {final.map((p, i) => (
            <li key={`${p.sectionId}-${p.rangeFrom}-${i}`} className="flex items-center gap-1.5">
              <TextInput
                size="sm"
                aria-label="Görev başlığı"
                maxLength={200}
                value={titles[i] ?? plans[i].title}
                onChange={(e) => setTitles((t) => ({ ...t, [i]: e.target.value }))}
              />
              <div className="w-20 shrink-0">
                <TextInput
                  size="sm"
                  aria-label="Süre"
                  placeholder="süre"
                  value={estimates[i] ?? (plans[i].estimateMinutes ? formatEstimate(plans[i].estimateMinutes!) : "")}
                  onChange={(e) => setEstimates((t) => ({ ...t, [i]: e.target.value }))}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <span className="flex-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
          {final.length > 1 ? `${final.length} görev oluşacak` : ""}
        </span>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
        <Button type="submit" size="sm" variant="primary" disabled={final.length === 0 || !dueDate} loading={create.isPending}>
          Ekle
        </Button>
      </div>
    </form>
  );
}
