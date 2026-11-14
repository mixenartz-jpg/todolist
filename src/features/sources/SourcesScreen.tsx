"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SelectInput } from "@/components/Field";
import { ScreenBody } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { SkeletonList } from "@/components/Skeleton";
import { Toast, useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";
import { useSaveSource } from "./queries";
import { SourceForm } from "./SourceForm";
import {
  EXAMS,
  KIND_LABELS,
  LEVEL_LABELS,
  STATUS_LABELS,
  type SourceKind,
  type SourceStatus,
} from "./types";
import { KindIcon, percent, StatusBadge, SummaryBar } from "./ui";
import { useSourceProgress } from "./useSourceProgress";
import type { SourceProgress } from "./progress";

const OTHER = "Diğer";

/**
 * Kütüphane: ders ders gruplu kaynak kartları. İlerleme yalnızca
 * katalogdan oluşturulan görevlerden ve elle işaretlerden hesaplanır
 * (bkz. `unitStatus.ts`).
 */
export function SourcesScreen() {
  const toast = useToast();
  const router = useRouter();
  const { trees, topics, progress, studentId, loading } = useSourceProgress({ autoStatus: true });
  const save = useSaveSource((m) => toast.show(m));
  const [adding, setAdding] = useState(false);
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");

  const subjects = useMemo(
    () => [...new Set(trees.map((t) => t.subject?.trim() || OTHER))].sort((a, b) => a.localeCompare(b, "tr")),
    [trees],
  );

  const filtered = trees.filter(
    (t) =>
      (!subject || (t.subject?.trim() || OTHER) === subject) &&
      (!exam || t.exam === exam) &&
      (!kind || t.kind === kind) &&
      (!status || t.status === status),
  );

  const groups = useMemo(() => {
    const map = new Map<string, SourceProgress[]>();
    for (const t of filtered) {
      const key = t.subject?.trim() || OTHER;
      const p = progress.get(t.id);
      if (!p) continue;
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b, "tr")));
  }, [filtered, progress]);

  const count = (s: SourceStatus) => trees.filter((t) => t.status === s).length;

  return (
    <ScreenBody width="3xl">
      <SectionTitle
        trailing={
          !adding && (
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              + Kaynak ekle
            </Button>
          )
        }
      >
        Kaynaklar
      </SectionTitle>

      {adding && (
        <SourceForm
          initial={null}
          topics={topics}
          pending={save.isPending}
          linkedItemIds={new Set()}
          linkedSectionIds={new Set()}
          onCancel={() => setAdding(false)}
          onSave={(input) =>
            save.mutate(
              { ...input, studentId },
              {
                onSuccess: (id) => {
                  setAdding(false);
                  router.push(`/koc/planlama/kaynaklar/${id}`);
                },
              },
            )
          }
        />
      )}

      {!loading && trees.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {trees.length} kaynak · {count("devam")} devam · {count("bitti")} bitti
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Filter label="Ders" value={subject} onChange={setSubject} options={subjects.map((s) => [s, s])} />
            <Filter label="Sınav" value={exam} onChange={setExam} options={EXAMS.map((x) => [x, x])} />
            <Filter
              label="Tür"
              value={kind}
              onChange={setKind}
              options={(Object.keys(KIND_LABELS) as SourceKind[]).map((k) => [k, KIND_LABELS[k]])}
            />
            <Filter
              label="Durum"
              value={status}
              onChange={setStatus}
              options={(Object.keys(STATUS_LABELS) as SourceStatus[]).map((s) => [s, STATUS_LABELS[s]])}
            />
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonList count={3} height={72} />
      ) : trees.length === 0 ? (
        <Card tone="sunken">
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            Henüz kaynak yok. Kitabı ya da video kursunu içindekileriyle ekle; görevler buradan oluşturulunca
            ilerleme kendiliğinden işler.
          </p>
        </Card>
      ) : groups.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">Filtreye uyan kaynak yok.</p>
      ) : (
        groups.map(([name, list]) => (
          <section key={name} aria-label={name} className="flex flex-col gap-2">
            <SectionTitle level={3}>{name}</SectionTitle>
            <ul className="grid gap-2 sm:grid-cols-2">
              {list.map((p) => (
                <SourceCard key={p.source.id} p={p} />
              ))}
            </ul>
          </section>
        ))
      )}

      <Toast message={toast.message} variant={toast.variant} token={toast.token} onDismiss={toast.dismiss} />
    </ScreenBody>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <SelectInput size="sm" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}: tümü</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </SelectInput>
  );
}

function SourceCard({ p }: { p: SourceProgress }) {
  const s = p.source;
  const meta = [s.publisher, s.exam, s.level ? LEVEL_LABELS[s.level] : null].filter(Boolean).join(" · ");
  return (
    <li>
      <Link
        href={`/koc/planlama/kaynaklar/${s.id}`}
        className="block rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-line-3)]"
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-[var(--color-ink-2)]">
            <KindIcon kind={s.kind} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[length:var(--text-base)] font-medium">{s.title}</p>
            <p className="truncate text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
              {meta || "—"} · {p.summary.green}/{p.summary.total} {s.unit}
            </p>
          </div>
          <span className="shrink-0 text-[length:var(--text-lg)] font-semibold tabular-nums">%{percent(p.summary)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <SummaryBar summary={p.summary} className="flex-1" />
          <StatusBadge status={s.status} />
        </div>
      </Link>
    </li>
  );
}
