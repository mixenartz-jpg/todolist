"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, SelectInput, TextInput } from "@/components/Field";
import { ScreenBody } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { SkeletonList } from "@/components/Skeleton";
import { Toast, useToast } from "@/components/Toast";
import { useTasks } from "@/features/tasks/queries";
import type { Task } from "@/features/tasks/types";
import { addDays, todayStr } from "@/lib/date/date";
import { formatShortDate } from "@/lib/ui/tr";
import { linkTask, looksLikeSourceTask, parseRange } from "./parse";
import { sourceProgress, type SourceProgress } from "./progress";
import { useArchiveSource, useLinkTaskSource, useSaveSource, useSources } from "./queries";
import { UNIT_LABELS, type Source, type SourceDraft, type SourceUnit } from "./types";

/** Eşleşmeyenler listesi bu kadar gün geriye bakar. */
const UNMATCHED_DAYS = 60;

/**
 * Kaynaklar: her kitap için ilerleme (tamamlanan görevlerin aralık
 * birleşimi / toplam). Görevler başlıktan otomatik eşleşir;
 * eşleşmeyenler altta, tek tıkla bağlanır.
 */
export function SourcesScreen() {
  const toast = useToast();
  const sourcesQuery = useSources();
  const tasksQuery = useTasks();
  const save = useSaveSource((m) => toast.show(m));
  const archive = useArchiveSource((m) => toast.show(m));
  const link = useLinkTaskSource((m) => toast.show(m));
  const [editing, setEditing] = useState<Source | "new" | null>(null);

  const sources = useMemo(() => sourcesQuery.data ?? [], [sourcesQuery.data]);
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const progress = useMemo(() => sourceProgress(sources, tasks), [sources, tasks]);

  const today = todayStr();
  const unmatched = useMemo(() => {
    const from = addDays(today, -UNMATCHED_DAYS);
    return tasks
      .filter((t) => t.dueDate !== null && t.dueDate >= from)
      .filter((t) => looksLikeSourceTask(t.title) && !linkTask(t, sources))
      .sort((a, b) => ((a.dueDate ?? "") < (b.dueDate ?? "") ? 1 : -1));
  }, [tasks, sources, today]);

  const loading = sourcesQuery.isPending || tasksQuery.isPending;

  return (
    <ScreenBody width="2xl">
      <SectionTitle
        trailing={
          editing === null && (
            <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
              + Kaynak ekle
            </Button>
          )
        }
      >
        Kaynaklar
      </SectionTitle>

      {editing !== null && (
        <SourceForm
          initial={editing === "new" ? null : editing}
          pending={save.isPending}
          onCancel={() => setEditing(null)}
          onSave={(draft) =>
            save.mutate(
              { id: editing === "new" ? undefined : editing.id, draft },
              { onSuccess: () => setEditing(null) },
            )
          }
          onArchive={
            editing !== "new"
              ? () => archive.mutate(editing.id, { onSuccess: () => setEditing(null) })
              : undefined
          }
        />
      )}

      {loading ? (
        <SkeletonList count={3} height={72} />
      ) : progress.length === 0 ? (
        <Card tone="sunken">
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            Henüz kaynak yok. Kitabı adı ve toplam test sayısıyla ekle; &quot;Kitap | Konu | 12-18&quot;
            biçimindeki görevler otomatik eşleşir.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {progress.map((p) => (
            <SourceRowCard key={p.source.id} p={p} onEdit={() => setEditing(p.source)} />
          ))}
        </ul>
      )}

      {!loading && sources.length > 0 && unmatched.length > 0 && (
        <Card as="section" aria-label="Eşleşmeyen görevler">
          <SectionTitle level={3}>Eşleşmeyen görevler · son {UNMATCHED_DAYS} gün</SectionTitle>
          <ul className="mt-2 flex flex-col divide-y divide-[var(--color-line)]">
            {unmatched.slice(0, 20).map((t) => (
              <UnmatchedRow
                key={t.id}
                task={t}
                sources={sources}
                onLink={(sourceId) =>
                  link.mutate({
                    taskId: t.id,
                    sourceId,
                    range: parseRange(t.title.split("|").slice(1)),
                  })
                }
              />
            ))}
          </ul>
        </Card>
      )}

      <Toast message={toast.message} variant={toast.variant} token={toast.token} onDismiss={toast.dismiss} />
    </ScreenBody>
  );
}

function SourceRowCard({ p, onEdit }: { p: SourceProgress; onEdit: () => void }) {
  const pct = Math.round(p.ratio * 100);
  const unit = UNIT_LABELS[p.source.unit];
  return (
    <Card as="li" pad="sm">
      <div className="flex items-baseline gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[length:var(--text-base)] font-medium">{p.source.title}</p>
          <p className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
            {p.source.subject ? `${p.source.subject} · ` : ""}
            {p.covered}/{p.source.totalTests} {unit} · {p.doneCount}/{p.taskCount} görev
            {p.last && ` · son: ${p.last.from}-${p.last.to}${p.last.date ? ` (${formatShortDate(p.last.date)})` : ""}`}
          </p>
        </div>
        <span className="shrink-0 text-[length:var(--text-lg)] font-semibold tabular-nums">%{pct}</span>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded px-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
          aria-label={`${p.source.title} düzenle`}
        >
          Düzenle
        </button>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]" aria-hidden>
        <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
      </div>
      {p.doneWithoutRange > 0 && (
        <p className="mt-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
          {p.doneWithoutRange} tamamlanan görevde aralık yok (yüzdeye girmedi)
        </p>
      )}
    </Card>
  );
}

function UnmatchedRow({
  task,
  sources,
  onLink,
}: {
  task: Task;
  sources: readonly Source[];
  onLink: (sourceId: string) => void;
}) {
  return (
    <li className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[length:var(--text-sm)]">{task.title}</p>
        {task.dueDate && (
          <p className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">{formatShortDate(task.dueDate)}</p>
        )}
      </div>
      <div className="w-44 shrink-0">
      <SelectInput
        size="sm"
        aria-label={`${task.title} için kaynak`}
        value=""
        onChange={(e) => e.target.value && onLink(e.target.value)}
      >
        <option value="">Kaynağa bağla…</option>
        {sources.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </SelectInput>
      </div>
    </li>
  );
}

function SourceForm({
  initial,
  pending,
  onSave,
  onCancel,
  onArchive,
}: {
  initial: Source | null;
  pending: boolean;
  onSave: (draft: SourceDraft) => void;
  onCancel: () => void;
  onArchive?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [total, setTotal] = useState(initial ? String(initial.totalTests) : "");
  const [unit, setUnit] = useState<SourceUnit>(initial?.unit ?? "test");
  const [aliases, setAliases] = useState(initial?.aliases.join(", ") ?? "");

  const totalNum = Math.floor(Number(total));
  const valid = title.trim().length > 0 && totalNum >= 1 && totalNum <= 100000;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onSave({
      title,
      subject: subject || null,
      totalTests: totalNum,
      unit,
      aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean),
    });
  }

  return (
    <Card as="section" aria-label={initial ? "Kaynağı düzenle" : "Yeni kaynak"}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field label="Kaynak adı" className="col-span-2">
          {(p) => (
            <TextInput {...p} size="sm" autoFocus maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kafadengi Matematik" />
          )}
        </Field>
        <Field label="Ders">
          {(p) => <TextInput {...p} size="sm" maxLength={60} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Matematik" />}
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Toplam">
            {(p) => (
              <TextInput {...p} size="sm" inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))} placeholder="60" />
            )}
          </Field>
          <Field label="Birim">
            {(p) => (
              <SelectInput {...p} size="sm" value={unit} onChange={(e) => setUnit(e.target.value as SourceUnit)}>
                <option value="test">test</option>
                <option value="soru">soru</option>
                <option value="sayfa">sayfa</option>
              </SelectInput>
            )}
          </Field>
        </div>
        <Field
          label="Diğer yazılışlar"
          hint="Görev başlıklarında geçen kısaltmalar, virgülle. Ör: Kafadengi Mat, KD"
          className="col-span-2"
        >
          {(p) => <TextInput {...p} size="sm" value={aliases} onChange={(e) => setAliases(e.target.value)} />}
        </Field>
        <div className="col-span-2 flex items-center gap-2">
          {onArchive && (
            <Button type="button" size="sm" variant="danger" onClick={onArchive}>
              Arşivle
            </Button>
          )}
          <span className="flex-1" />
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
          <Button type="submit" size="sm" disabled={!valid} loading={pending}>
            Kaydet
          </Button>
        </div>
      </form>
    </Card>
  );
}
