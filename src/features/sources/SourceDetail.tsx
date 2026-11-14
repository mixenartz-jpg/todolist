"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SelectInput } from "@/components/Field";
import { ScreenBody } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { SkeletonList } from "@/components/Skeleton";
import { Toast, useToast } from "@/components/Toast";
import { resultSummary } from "@/features/results/format";
import { ResultIcon } from "@/features/results/ResultDetails";
import { formatShortDate } from "@/lib/ui/tr";
import type { DateStr } from "@/lib/date/types";
import type { SourceMarks } from "./markQueries";
import { MarkBar, RangeMarkInput, UnitMenu, useApplyMarks } from "./MarkActions";
import { AddTasksForm } from "./AddTasksForm";
import { planTasks, progressLine } from "./title";
import { addDays, todayStr } from "@/lib/date/date";
import { mainResult, type SectionProgress, type SeriesProgress, type SourceProgress } from "./progress";
import { useCatalogSelection, type CatalogSelection } from "./selection";
import { useArchiveSource, useSaveSource, useSetSourceStatus, useSourceResults, useTaskItems } from "./queries";
import { SourceForm } from "./SourceForm";
import {
  KIND_LABELS,
  LEVEL_LABELS,
  SERIES_KIND_LABELS,
  STATUS_LABELS,
  type SourceStatus,
  type Topic,
} from "./types";
import { KindIcon, percent, StatusBadge, SummaryBar } from "./ui";
import { RangeBar, TestGrid } from "./UnitGrid";
import { nextFreeRun, nextFreeUnits } from "./unitStatus";
import { useSourceProgress } from "./useSourceProgress";

/**
 * Kaynak detayı: seriler başlık, altında bölümler; her bölümde ilerleme,
 * sıradaki aralık, kutucuklar ve bağlı görevlerin sonuçları.
 */
export function SourceDetail({
  sourceId,
  selectionExtra,
}: {
  sourceId: string;
  /** Eylem çubuğuna ek düğmeler (ör. "Güne ekle"). */
  selectionExtra?: (p: SourceProgress, selection: CatalogSelection) => ReactNode;
}) {
  const toast = useToast();
  const router = useRouter();
  const { trees, topics, progress, marks, studentId, loading } = useSourceProgress({ autoStatus: true });
  const selection = useCatalogSelection();
  const [adding, setAdding] = useState(false);
  const itemsQuery = useTaskItems();
  const resultsQuery = useSourceResults(studentId);
  const save = useSaveSource((m) => toast.show(m));
  const archive = useArchiveSource((m) => toast.show(m));
  const setStatus = useSetSourceStatus((m) => toast.show(m));
  const [editing, setEditing] = useState(false);

  const p = progress.get(sourceId);
  const tree = trees.find((t) => t.id === sourceId);

  const linkedItemIds = useMemo(() => new Set((itemsQuery.data ?? []).map((r) => r.itemId)), [itemsQuery.data]);
  const linkedSectionIds = useMemo(
    () =>
      new Set(
        (p?.series ?? []).flatMap((s) => s.sections.filter((x) => x.tasks.length > 0).map((x) => x.section.id)),
      ),
    [p],
  );

  if (loading) {
    return (
      <ScreenBody width="3xl">
        <SkeletonList count={4} height={88} />
      </ScreenBody>
    );
  }

  if (!p || !tree) {
    return (
      <ScreenBody width="3xl">
        <Card tone="sunken">
          <p className="text-[length:var(--text-sm)]">Kaynak bulunamadı (arşivlenmiş olabilir).</p>
          <Link href="/koc/planlama/kaynaklar" className="mt-2 inline-block text-[var(--color-accent)] hover:underline">
            ← Kaynaklar
          </Link>
        </Card>
      </ScreenBody>
    );
  }

  const s = p.source;
  const topicName = new Map(topics.map((t) => [t.id, t] as const));
  const meta = [
    KIND_LABELS[s.kind],
    s.publisher,
    s.subject,
    s.exam,
    s.level ? LEVEL_LABELS[s.level] : null,
    s.minutesPerUnit ? `${s.minutesPerUnit} dk/${s.unit}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScreenBody width="3xl">
      <Link href="/koc/planlama/kaynaklar" className="text-[length:var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]">
        ← Kaynaklar
      </Link>

      {editing ? (
        <SourceForm
          initial={tree}
          topics={topics}
          pending={save.isPending}
          linkedItemIds={linkedItemIds}
          linkedSectionIds={linkedSectionIds}
          onCancel={() => setEditing(false)}
          onSave={(input) => save.mutate({ ...input, studentId }, { onSuccess: () => setEditing(false) })}
          onArchive={() =>
            archive.mutate(s.id, { onSuccess: () => router.push("/koc/planlama/kaynaklar") })
          }
        />
      ) : (
        <Card as="section" aria-label={s.title}>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-[var(--color-ink-2)]">
              <KindIcon kind={s.kind} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-[length:var(--text-lg)] font-semibold leading-snug">{s.title}</h1>
              <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">{meta}</p>
            </div>
            <span className="shrink-0 text-[length:var(--text-xl)] font-semibold tabular-nums">%{percent(p.summary)}</span>
          </div>
          <SummaryBar summary={p.summary} className="mt-3" />
          <p className="mt-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
            {p.summary.green} çözüldü · {p.summary.yellow} atandı · {p.summary.red} havuza döndü ·{" "}
            {p.summary.gray} boş ({p.summary.total} {s.unit})
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} />
            <SelectInput
              size="sm"
              aria-label="Durumu elle değiştir"
              className="w-36"
              value={s.status}
              onChange={(e) => setStatus.mutate({ id: s.id, status: e.target.value as SourceStatus })}
            >
              {(Object.keys(STATUS_LABELS) as SourceStatus[]).map((k) => (
                <option key={k} value={k}>
                  {STATUS_LABELS[k]}
                </option>
              ))}
            </SelectInput>
            <span className="flex-1" />
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              Düzenle
            </Button>
          </div>
        </Card>
      )}

      {p.series.map((sp) => (
        <SeriesCard
          key={sp.series.id}
          sp={sp}
          unit={s.unit}
          topics={topicName}
          results={resultsQuery.data ?? []}
          single={p.series.length === 1}
          selection={selection}
          progress={p}
          marks={marks}
          onError={(m) => toast.show(m)}
        />
      ))}

      {adding && selection.count > 0 && (
        <Card as="section" aria-label="Güne ekle">
          <SectionTitle level={3}>Güne ekle</SectionTitle>
          <div className="mt-2">
            <AddTasksForm
              kind={s.kind}
              defaultDate={addDays(todayStr(), 1)}
              build={(action, dueDate) =>
                planTasks({ source: s, topics: topicName, picks: selection.sel, action, dueDate })
              }
              onCancel={() => setAdding(false)}
              onError={(m) => toast.show(m)}
              onCreated={(plans) => {
                toast.show(`${plans.length} görev eklendi`);
                selection.clear();
                setAdding(false);
              }}
            />
          </div>
        </Card>
      )}

      <MarkBar
        selection={selection}
        progress={p}
        marks={marks}
        extra={
          <>
            <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
              Güne ekle
            </Button>
            {selectionExtra?.(p, selection)}
          </>
        }
        onError={(m) => toast.show(m)}
      />

      <Toast message={toast.message} variant={toast.variant} token={toast.token} onDismiss={toast.dismiss} />
    </ScreenBody>
  );
}

function SeriesCard({
  sp,
  unit,
  topics,
  results,
  single,
  selection,
  progress,
  marks,
  onError,
}: {
  sp: SeriesProgress;
  unit: string;
  topics: ReadonlyMap<string, Topic>;
  results: Parameters<typeof mainResult>[1];
  single: boolean;
  selection: CatalogSelection;
  progress: SourceProgress;
  marks: SourceMarks;
  onError: (m: string) => void;
}) {
  return (
    <Card as="section" aria-label={sp.series.name}>
      <SectionTitle
        trailing={
          <span className="text-[length:var(--text-sm)] tabular-nums text-[var(--color-ink-2)]">
            {sp.summary.green}/{sp.summary.total}
          </span>
        }
      >
        {sp.series.name}
        {!single && (
          <span className="ml-2 align-middle text-[length:var(--text-2xs)] font-normal text-[var(--color-ink-3)]">
            {SERIES_KIND_LABELS[sp.series.kind]}
          </span>
        )}
      </SectionTitle>
      <ul className="mt-2 flex flex-col divide-y divide-[var(--color-line)]">
        {sp.sections.map((sec) => (
          <SectionRow
            key={sec.section.id}
            sec={sec}
            unit={unit}
            topics={topics}
            results={results}
            selection={selection}
            progress={progress}
            marks={marks}
            onError={onError}
          />
        ))}
      </ul>
    </Card>
  );
}

function SectionRow({
  sec,
  unit,
  topics,
  results,
  selection,
  progress,
  marks,
  onError,
}: {
  sec: SectionProgress;
  unit: string;
  topics: ReadonlyMap<string, Topic>;
  results: Parameters<typeof mainResult>[1];
  selection: CatalogSelection;
  progress: SourceProgress;
  marks: SourceMarks;
  onError: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<{ n: number; anchor: HTMLElement } | null>(null);
  const [rangeText, setRangeText] = useState("");
  const { apply } = useApplyMarks(onError);
  const closeMenu = useCallback(() => setMenu(null), []);
  const sectionId = sec.section.id;
  const selected = selection.sel.get(sectionId);
  const topic = sec.section.topicId ? topics.get(sec.section.topicId) : undefined;
  const next =
    unit === "test"
      ? nextFreeUnits(sec.states, 1)[0]
      : (() => {
          const r = nextFreeRun(sec.states, Number.POSITIVE_INFINITY);
          return r ? `${r.from}-${r.to}` : undefined;
        })();
  const itemTopics = sec.section.items.filter((i) => i.topicId && i.topicId !== sec.section.topicId);

  return (
    <li className="py-3">
      <div className="flex items-baseline gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{sec.section.label}</p>
          <p className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
            {sec.section.unitFrom}-{sec.section.unitTo}
            {topic && topic.name !== sec.section.label ? ` · ${topic.name}` : ""}
            {next !== undefined ? ` · sıradaki: ${next}` : " · hepsi atandı"}
          </p>
        </div>
        <span className="shrink-0 text-[length:var(--text-sm)] tabular-nums">%{percent(sec.summary)}</span>
      </div>
      <div className="mt-2">
        {unit === "test" ? (
          <TestGrid
            states={sec.states}
            selected={selected}
            onPick={(n, shift) => selection.pick(sectionId, n, shift)}
            onMenu={(n, anchor) => setMenu({ n, anchor })}
          />
        ) : (
          <>
            <RangeBar
              states={sec.states}
              unitLabel={unit}
              onSegment={(from, to) => setRangeText(from === to ? String(from) : `${from}-${to}`)}
            />
            <RangeMarkInput
              min={sec.section.unitFrom}
              max={sec.section.unitTo}
              unitLabel={unit}
              value={rangeText}
              onChange={setRangeText}
              onSelect={(span) => {
                const numbers: number[] = [];
                for (let n = span.from; n <= span.to; n++) numbers.push(n);
                selection.selectOnly(sectionId, numbers);
              }}
              onApply={(span, status) => {
                const numbers: number[] = [];
                for (let n = span.from; n <= span.to; n++) numbers.push(n);
                apply(progress, new Map([[sectionId, new Set(numbers)]]), marks, status, null);
                setRangeText("");
              }}
            />
          </>
        )}
        {menu && (
          <UnitMenu
            anchor={menu.anchor}
            title={`${sec.section.label} · ${menu.n}. test`}
            onClose={closeMenu}
            onAction={(status) => {
              apply(progress, new Map([[sectionId, new Set([menu.n])]]), marks, status, null);
              setMenu(null);
            }}
          />
        )}
      </div>
      {itemTopics.length > 0 && (
        <p className="mt-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
          {itemTopics.map((i) => `${i.number}: ${topics.get(i.topicId!)?.name ?? "?"}`).join(" · ")}
        </p>
      )}
      {sec.tasks.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-[length:var(--text-sm)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            {open ? "▾" : "▸"} {sec.tasks.length} görev
          </button>
          {open && (
            <ul className="mt-1 flex flex-col gap-1">
              {sec.tasks.map((t) => {
                const r = mainResult(t, results);
                const watch = r?.understanding ? ["anlamadı", "kısmen anladı", "anladı"][r.understanding - 1] : null;
                const line = [progressLine(t, r, unit), r ? resultSummary(r) : null, watch, r?.feynmanNote]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={t.id} className="flex items-baseline gap-2 text-[length:var(--text-sm)]">
                    <ResultIcon status={r?.status ?? (t.done ? "done" : null)} />
                    <span className="w-14 shrink-0 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                      {t.dueDate ? formatShortDate(t.dueDate as DateStr) : "—"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{t.title}</span>
                      {line && <span className="block text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">{line}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
