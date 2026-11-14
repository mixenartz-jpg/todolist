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
import { formatShortDate } from "@/lib/ui/tr";
import { sourceProgress, type SourceProgress } from "./progress";
import { useArchiveSource, useSaveSource, useSources } from "./queries";
import { UNIT_LABELS, type Source, type SourceDraft, type SourceUnit } from "./types";

/**
 * Kaynaklar: her kitap için ilerleme (tamamlanan görevlerin aralık
 * birleşimi / toplam). Bağ yalnızca kaynaktan oluşturulan görevlerde
 * kurulur; başlıktan eşleştirme yok.
 */
export function SourcesScreen() {
  const toast = useToast();
  const sourcesQuery = useSources();
  const tasksQuery = useTasks();
  const save = useSaveSource((m) => toast.show(m));
  const archive = useArchiveSource((m) => toast.show(m));
  const [editing, setEditing] = useState<Source | "new" | null>(null);

  const sources = useMemo(() => sourcesQuery.data ?? [], [sourcesQuery.data]);
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const progress = useMemo(() => sourceProgress(sources, tasks), [sources, tasks]);

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
            Henüz kaynak yok. Kitabı adı ve toplam test sayısıyla ekle.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {progress.map((p) => (
            <SourceRowCard key={p.source.id} p={p} onEdit={() => setEditing(p.source)} />
          ))}
        </ul>
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
      aliases: initial?.aliases ?? [],
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
