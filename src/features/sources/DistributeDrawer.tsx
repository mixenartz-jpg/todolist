"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Field, SelectInput, TextInput } from "@/components/Field";
import { Toast, useToast } from "@/components/Toast";
import { PLAN_THRESHOLDS } from "@/features/alerts/thresholds";
import { hasResultContent } from "@/features/results/format";
import { formatEstimate } from "@/features/tasks/estimate";
import { useTasks } from "@/features/tasks/queries";
import { addDays, isDateStr, todayStr } from "@/lib/date/date";
import type { DateStr, IsoWeekday } from "@/lib/date/types";
import { formatShortDate, WEEKDAYS_SHORT } from "@/lib/ui/tr";
import { cn } from "@/lib/ui/cn";
import { useTaskActions } from "./actionQueries";
import { defaultAction, PROGRESS_ACTION } from "./actions";
import { insertBatch, useDeleteBatchTasks, useMoveTasks, usePlanBatches, type PlanBatch } from "./batchQueries";
import { deletableTasks, distribute, parseNumberList, rowMinutes, shiftTasks, type DistributionRow, type Slice } from "./distribute";
import { plansFromRows, seriesSlice, sourceHasTopic, topicSlice, unitsFromNumbers } from "./distributePlan";
import { parseRangeInput } from "./marks";
import type { SourceProgress } from "./progress";
import { useSourceResults } from "./queries";
import { newIds, useCreatePlannedTasks } from "./taskCreate";
import { formatNumbers } from "./title";
import { useSourceProgress } from "./useSourceProgress";

const ALL_DAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Planlama üst barındaki düğme + çekmece. */
export function DistributeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Dağıt
      </Button>
      {open && <DistributeDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

export function DistributeDrawer({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<"new" | "list">("new");
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[color-mix(in_oklch,black_40%,transparent)]" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Dağıt"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="flex h-full w-full max-w-3xl flex-col bg-[var(--color-surface)] shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
          <h2 className="text-[length:var(--text-lg)] font-semibold">Dağıt</h2>
          <div role="tablist" className="ml-3 flex gap-1">
            {(
              [
                ["new", "Yeni dağıtım"],
                ["list", "Dağıtımlar"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[length:var(--text-sm)]",
                  tab === k ? "bg-[var(--color-surface-2)] font-medium" : "text-[var(--color-ink-3)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Kapat">
            ✕
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "new" ? (
            <NewDistribution onMessage={toast.show} onDone={() => setTab("list")} />
          ) : (
            <BatchList onMessage={toast.show} />
          )}
        </div>
        <Toast message={toast.message} variant={toast.variant} token={toast.token} onDismiss={toast.dismiss} />
      </aside>
    </div>
  );
}

function NewDistribution({ onMessage, onDone }: { onMessage: (m: string) => void; onDone: () => void }) {
  const { trees, topics, progress, studentId } = useSourceProgress();
  const tasksQuery = useTasks();
  const actions = useTaskActions().filter((a) => a !== PROGRESS_ACTION);
  const create = useCreatePlannedTasks(onMessage);

  const [target, setTarget] = useState<"topic" | "series">("topic");
  const [subject, setSubject] = useState("");
  const [topicId, setTopicId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [ranges, setRanges] = useState<Record<string, string>>({});
  const [start, setStart] = useState<string>(addDays(todayStr(), 1));
  const [mode, setMode] = useState<"days" | "perDay">("days");
  const [count, setCount] = useState("3");
  const [skip, setSkip] = useState<ReadonlySet<IsoWeekday>>(new Set([7]));
  const [action, setAction] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const subjects = [...new Set(trees.map((t) => t.subject?.trim()).filter(Boolean) as string[])].sort((a, b) =>
    a.localeCompare(b, "tr"),
  );
  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t] as const)), [topics]);
  const all = [...progress.values()];
  const topicOptions = topics.filter(
    (t) => (!subject || t.subject === subject) && all.some((p) => sourceHasTopic(p, t.id)),
  );

  // Seçili hedefe göre kaynaklar ve dilimler.
  const candidates: SourceProgress[] =
    target === "topic"
      ? topicId
        ? all.filter((p) => sourceHasTopic(p, topicId))
        : []
      : sourceId && progress.get(sourceId)
        ? [progress.get(sourceId)!]
        : [];
  const chosen = candidates.filter((p) => !excluded.has(p.source.id));
  const slices: Slice[] = chosen
    .map((p) => {
      const range = ranges[p.source.id]?.trim()
        ? parseRangeInput(ranges[p.source.id], 1, 100000)
        : null;
      const spec = { progress: p, range };
      return target === "topic" ? topicSlice(spec, topicId) : seriesSlice(spec, seriesId);
    })
    .filter((s) => s.units.length > 0);

  const n = Math.max(1, Math.floor(Number(count)) || 1);
  const startDate = isDateStr(start) ? start : null;
  const baseRows: DistributionRow[] =
    startDate && slices.length > 0
      ? distribute(slices, startDate, mode === "days" ? { kind: "days", days: n } : { kind: "perDay", perDay: n }, skip)
      : [];

  // Elle düzenlenen hücreler.
  const rows: DistributionRow[] = baseRows.map((r) => ({
    date: r.date,
    cells: new Map(
      [...r.cells].map(([key, units]) => {
        const text = edits[`${r.date}|${key}`];
        if (text === undefined) return [key, units];
        const numbers = parseNumberList(text);
        const p = progress.get(key);
        const slice = slices.find((s) => s.key === key);
        return [key, numbers && p && slice ? unitsFromNumbers(numbers, slice, p) : units];
      }),
    ),
  }));

  const mpu = new Map(chosen.map((p) => [p.source.id, p.source.minutesPerUnit] as const));
  const existingLoad = (date: DateStr) =>
    (tasksQuery.data ?? []).filter((t) => t.dueDate === date).reduce((m, t) => m + (t.estimateMinutes ?? 0), 0);

  async function confirm() {
    if (rows.length === 0) return;
    const plans = plansFromRows(rows, progress, topicMap, (p) => action || defaultAction(p.source.kind));
    if (plans.length === 0) return;
    setBusy(true);
    try {
      const batchId = crypto.randomUUID();
      const what =
        target === "topic"
          ? (topicMap.get(topicId)?.name ?? "Konu")
          : `${progress.get(sourceId)?.source.title ?? ""} ${progress.get(sourceId)?.series.find((s) => s.series.id === seriesId)?.series.name ?? ""}`;
      await insertBatch({
        id: batchId,
        label: `${what.trim()} · ${chosen.length} kaynak · ${formatShortDate(rows[0].date)}–${formatShortDate(rows[rows.length - 1].date)}`,
        studentId,
        topicId: target === "topic" ? topicId : null,
        sourceId: target === "series" ? sourceId : null,
        seriesId: target === "series" ? seriesId : null,
        skipWeekdays: [...skip],
      });
      create.mutate(
        { plans, ids: newIds(plans.length), planBatchId: batchId },
        {
          onSuccess: () => {
            onMessage(`${plans.length} görev oluşturuldu`);
            setEdits({});
            onDone();
          },
        },
      );
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Dağıtılamadı");
    } finally {
      setBusy(false);
    }
  }

  const selectedSource = sourceId ? progress.get(sourceId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Hedef" className="flex gap-1.5">
        {(
          [
            ["topic", "Konuya göre"],
            ["series", "Kaynak + seri"],
          ] as const
        ).map(([k, label]) => (
          <Chip key={k} active={target === k} onClick={() => setTarget(k)}>
            {label}
          </Chip>
        ))}
      </div>

      {target === "topic" ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Ders">
            {(p) => (
              <SelectInput {...p} size="sm" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">Tümü</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label="Konu">
            {(p) => (
              <SelectInput {...p} size="sm" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                <option value="">Seç…</option>
                {topicOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.exam})
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Kaynak">
            {(p) => (
              <SelectInput
                {...p}
                size="sm"
                value={sourceId}
                onChange={(e) => {
                  setSourceId(e.target.value);
                  setSeriesId(progress.get(e.target.value)?.series[0]?.series.id ?? "");
                }}
              >
                <option value="">Seç…</option>
                {trees.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label="Seri">
            {(p) => (
              <SelectInput {...p} size="sm" value={seriesId} onChange={(e) => setSeriesId(e.target.value)}>
                {(selectedSource?.series ?? []).map((s) => (
                  <option key={s.series.id} value={s.series.id}>
                    {s.series.name}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </div>
      )}

      {candidates.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {candidates.map((p) => {
            const on = !excluded.has(p.source.id);
            const slice = slices.find((s) => s.key === p.source.id);
            return (
              <li key={p.source.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-line)] p-2">
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setExcluded((x) => {
                        const next = new Set(x);
                        if (on) next.add(p.source.id);
                        else next.delete(p.source.id);
                        return next;
                      })
                    }
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  <span className="truncate text-[length:var(--text-sm)]">{p.source.title}</span>
                </label>
                <span className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                  {slice ? `${slice.units.length} boş ${p.source.unit}` : "boş birim yok"}
                </span>
                <div className="w-32">
                  <TextInput
                    size="sm"
                    aria-label={`${p.source.title} aralık`}
                    placeholder="kalanın tamamı"
                    value={ranges[p.source.id] ?? ""}
                    onChange={(e) => setRanges((r) => ({ ...r, [p.source.id]: e.target.value }))}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Başlangıç">
          {(p) => <TextInput {...p} size="sm" type="date" value={start} onChange={(e) => setStart(e.target.value)} />}
        </Field>
        <Field label="Kip">
          {(p) => (
            <SelectInput {...p} size="sm" value={mode} onChange={(e) => setMode(e.target.value as "days" | "perDay")}>
              <option value="days">Gün sayısı</option>
              <option value="perDay">Günlük miktar (kaynak başına)</option>
            </SelectInput>
          )}
        </Field>
        <Field label={mode === "days" ? "Gün" : "Günde"}>
          {(p) => (
            <TextInput {...p} size="sm" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} />
          )}
        </Field>
        <Field label="Eylem">
          {(p) => (
            <SelectInput {...p} size="sm" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Kaynak türüne göre</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">Atlanacak günler</legend>
        <div className="flex flex-wrap gap-1.5">
          {ALL_DAYS.map((d) => (
            <Chip
              key={d}
              active={skip.has(d)}
              onClick={() =>
                setSkip((s) => {
                  const next = new Set(s);
                  if (next.has(d)) next.delete(d);
                  else next.add(d);
                  return next;
                })
              }
            >
              {WEEKDAYS_SHORT[d]}
            </Chip>
          ))}
        </div>
      </fieldset>

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-separate border-spacing-0 text-[length:var(--text-sm)]">
            <thead>
              <tr className="text-left text-[length:var(--text-2xs)] uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
                <th className="py-1 pr-2 font-medium">Gün</th>
                {slices.map((s) => (
                  <th key={s.key} className="py-1 pr-2 font-medium">
                    {progress.get(s.key)?.source.title}
                  </th>
                ))}
                <th className="py-1 font-medium">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const total = rowMinutes(r, mpu, existingLoad(r.date));
                const over = total > PLAN_THRESHOLDS.dailyMinutesWarn;
                return (
                  <tr key={r.date} className={over ? "bg-[color-mix(in_oklch,var(--color-warn)_14%,transparent)]" : undefined}>
                    <td className="py-1 pr-2 whitespace-nowrap">{formatShortDate(r.date)}</td>
                    {slices.map((s) => {
                      const units = r.cells.get(s.key) ?? [];
                      const key = `${r.date}|${s.key}`;
                      const minutes = units.length * (mpu.get(s.key) ?? 0);
                      return (
                        <td key={s.key} className="py-1 pr-2">
                          <input
                            aria-label={`${formatShortDate(r.date)} ${progress.get(s.key)?.source.title}`}
                            value={edits[key] ?? formatNumbers(units.map((u) => u.number), "-")}
                            onChange={(e) => setEdits((x) => ({ ...x, [key]: e.target.value }))}
                            className="h-8 w-full min-w-24 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface-2)] px-2 tabular-nums"
                          />
                          {minutes > 0 && (
                            <span className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">{formatEstimate(minutes)}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className={cn("py-1 whitespace-nowrap tabular-nums", over && "font-semibold text-[var(--color-warn)]")}>
                      {total ? formatEstimate(total) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
            Toplam, o günün mevcut görevlerini de içerir. {formatEstimate(PLAN_THRESHOLDS.dailyMinutesWarn)} üstü sarı.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="primary" disabled={rows.length === 0} loading={busy || create.isPending} onClick={confirm}>
          Onayla ve oluştur
        </Button>
      </div>
    </div>
  );
}

function BatchList({ onMessage }: { onMessage: (m: string) => void }) {
  const batches = usePlanBatches();
  const tasksQuery = useTasks();
  const { studentId } = useSourceProgress();
  const results = useSourceResults(studentId);
  const remove = useDeleteBatchTasks(onMessage);
  const move = useMoveTasks(onMessage);

  const resultTasks = useMemo(
    () => new Set((results.data ?? []).filter(hasResultContent).map((r) => r.taskId)),
    [results.data],
  );

  if (batches.isPending) return <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Yükleniyor…</p>;
  if ((batches.data ?? []).length === 0)
    return <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Henüz dağıtım yok.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {(batches.data ?? []).map((b) => {
        const tasks = (tasksQuery.data ?? [])
          .filter((t) => t.planBatchId === b.id)
          .map((t) => ({ id: t.id, dueDate: t.dueDate, hasResult: resultTasks.has(t.id) || t.done }));
        return (
          <BatchRow
            key={b.id}
            batch={b}
            tasks={tasks}
            pending={remove.isPending || move.isPending}
            onDelete={() => {
              const ids = deletableTasks(tasks);
              remove.mutate(
                { batchId: b.id, taskIds: ids, dropBatch: ids.length === tasks.length },
                { onSuccess: () => onMessage(`${ids.length} görev silindi${ids.length < tasks.length ? " (sonuçlular kaldı)" : ""}`) },
              );
            }}
            onShift={(from, n) => {
              const moves = shiftTasks(tasks, from, n, new Set(b.skipWeekdays));
              if (moves.length === 0) return onMessage("Kaydırılacak görev yok");
              move.mutate(moves, { onSuccess: () => onMessage(`${moves.length} görev ${n} gün kaydırıldı`) });
            }}
          />
        );
      })}
    </ul>
  );
}

function BatchRow({
  batch,
  tasks,
  pending,
  onDelete,
  onShift,
}: {
  batch: PlanBatch;
  tasks: Array<{ id: string; dueDate: DateStr | null; hasResult: boolean }>;
  pending: boolean;
  onDelete: () => void;
  onShift: (from: DateStr, n: number) => void;
}) {
  const [from, setFrom] = useState<string>(todayStr());
  const [n, setN] = useState("1");
  const [confirming, setConfirming] = useState(false);
  const withResult = tasks.filter((t) => t.hasResult).length;
  const dates = tasks.flatMap((t) => (t.dueDate ? [t.dueDate] : [])).sort();

  return (
    <li className="rounded-lg border border-[var(--color-line)] p-3">
      <p className="font-medium">{batch.label}</p>
      <p className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        {tasks.length} görev · {withResult} sonuçlu
        {dates.length ? ` · ${formatShortDate(dates[0])}–${formatShortDate(dates[dates.length - 1])}` : ""}
        {batch.skipWeekdays.length ? ` · atla: ${batch.skipWeekdays.map((d) => WEEKDAYS_SHORT[d]).join(", ")}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <Field label="Şu günden sonra">
          {(p) => (
            <div className="w-36">
              <TextInput {...p} size="sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
          )}
        </Field>
        <Field label="Gün">
          {(p) => (
            <div className="w-16">
              <TextInput {...p} size="sm" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ""))} />
            </div>
          )}
        </Field>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending || !isDateStr(from) || !(Number(n) >= 1)}
          onClick={() => isDateStr(from) && onShift(from, Number(n))}
        >
          Kaydır
        </Button>
        <span className="flex-1" />
        {confirming ? (
          <>
            <span className="text-[length:var(--text-sm)]">{tasks.length - withResult} sonuçsuz görev silinsin mi?</span>
            <Button size="sm" variant="danger" disabled={pending} onClick={onDelete}>
              Evet, sil
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Vazgeç
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(true)}>
            Dağıtımı sil
          </Button>
        )}
      </div>
    </li>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-[length:var(--text-sm)]",
        active
          ? "border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)] text-[var(--color-ink)]"
          : "border-[var(--color-line-2)] text-[var(--color-ink-2)]",
      )}
    >
      {children}
    </button>
  );
}
