"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, SelectInput, TextArea, TextInput } from "@/components/Field";
import { topicKey } from "@/features/topics/match";
import { cn } from "@/lib/ui/cn";
import { useAddTopic } from "./queries";
import { parseToc, tocText } from "./toc";
import { buildDraft, diffTree, sectionKey, treeAsToc, type TreeOps } from "./tree";
import {
  EXAMS,
  KIND_LABELS,
  LEVEL_LABELS,
  SERIES_KIND_LABELS,
  SUBJECTS,
  type Exam,
  type Level,
  type SeriesKind,
  type SourceDraft,
  type SourceKind,
  type SourceTree,
  type SourceUnit,
  type Topic,
} from "./types";

const BOOK_UNITS: SourceUnit[] = ["test", "soru", "sayfa"];

const PLACEHOLDER: Record<SourceKind, string> = {
  kitap: [
    "# Konu Testleri",
    "Basit Harmonik Hareket | 39-46",
    "Dalga Mekaniği | 5 test",
    "# ÖSYM Tipi | 1-10",
    "7 = Basit Harmonik Hareket",
    "# Sarmal | 1-8",
  ].join("\n"),
  video: ["12 | Basit Harmonik Hareket", "Dalga Mekaniği | 13-16"].join("\n"),
};

function newId(): string {
  return crypto.randomUUID();
}

export interface SourceFormSave {
  id: string;
  isNew: boolean;
  draft: SourceDraft;
  ops: TreeOps;
}

/**
 * Kaynak ekleme / düzenleme. İçindekiler metni tek doğruluk kaynağıdır:
 * düzenlemede mevcut ağaç metne çevrilir, kaydedilince eşleştirilir —
 * aynı bölüm ve testler kimliğini korur, görev bağları kopmaz.
 */
export function SourceForm({
  initial,
  topics,
  pending,
  linkedItemIds,
  linkedSectionIds,
  onSave,
  onCancel,
  onArchive,
}: {
  initial: SourceTree | null;
  topics: readonly Topic[];
  pending: boolean;
  /** Göreve bağlı testler / bölümler: silinecekse uyarı. */
  linkedItemIds: ReadonlySet<string>;
  linkedSectionIds: ReadonlySet<string>;
  onSave: (input: SourceFormSave) => void;
  onCancel: () => void;
  onArchive?: () => void;
}) {
  const [kind, setKind] = useState<SourceKind>(initial?.kind ?? "kitap");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [publisher, setPublisher] = useState(initial?.publisher ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [exam, setExam] = useState<Exam | "">(initial?.exam ?? "");
  const [level, setLevel] = useState<Level | "">(initial?.level ?? "");
  const [unit, setUnit] = useState<SourceUnit>(initial?.unit ?? "test");
  const [minutes, setMinutes] = useState(initial?.minutesPerUnit ? String(initial.minutesPerUnit) : "");
  const [toc, setToc] = useState(() =>
    initial ? tocText(treeAsToc(initial.series, topics), { kind: initial.kind, unit: initial.unit }) : "",
  );
  const [kindOverrides, setKindOverrides] = useState<Record<string, SeriesKind>>({});
  const [topicOverrides, setTopicOverrides] = useState<Record<string, string | null>>({});
  const [confirmLoss, setConfirmLoss] = useState(false);
  const [sourceId] = useState(() => initial?.id ?? newId());
  const addTopic = useAddTopic();

  const effectiveUnit: SourceUnit = kind === "video" ? "ders" : unit;
  const subjectScope = subject.trim() || null;
  const examScope: Exam | null = exam || null;
  const scope = { subject: subjectScope, exam: examScope };

  // React Compiler hesapları kendisi önbelleğe alır; elle useMemo yok.
  const parsed = parseToc(toc, { kind, unit: effectiveUnit });
  const draft = buildDraft(parsed, initial?.series ?? [], topics, {
    subject: subjectScope,
    exam: examScope,
    kindOverrides,
    topicOverrides,
    // Önizleme için sahte kimlik; kayıtta gerçek uuid.
    newId: () => "new",
  });

  const scopedTopics = topics.filter(
    (t) =>
      (!scope.subject || topicKey(t.subject) === topicKey(scope.subject)) && (!scope.exam || t.exam === scope.exam),
  );
  const topicName = new Map(topics.map((t) => [t.id, t.name]));

  // Silinecek bağlı satırlar (önizleme hesabı; kayıtta yeniden hesaplanır).
  const lossOps = initial ? diffTree(sourceId, effectiveUnit, draft, initial.series, () => "new") : null;
  const loss = {
    items: lossOps ? lossOps.deleteItems.filter((id) => linkedItemIds.has(id)).length : 0,
    sections: lossOps ? lossOps.deleteSections.filter((id) => linkedSectionIds.has(id)).length : 0,
  };

  const minutesNum = minutes.trim() === "" ? null : Number(minutes.replace(",", "."));
  const minutesValid = minutesNum === null || (Number.isFinite(minutesNum) && minutesNum > 0 && minutesNum <= 600);
  const valid = title.trim().length > 0 && draft.length > 0 && parsed.errors.length === 0 && minutesValid;
  const needsConfirm = loss.items + loss.sections > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    if (needsConfirm && !confirmLoss) {
      setConfirmLoss(true);
      return;
    }
    const realDraft = buildDraft(parsed, initial?.series ?? [], topics, {
      ...scope,
      kindOverrides,
      topicOverrides,
      newId,
    });
    onSave({
      id: sourceId,
      isNew: !initial,
      draft: {
        title,
        kind,
        publisher: publisher || null,
        subject: subject || null,
        exam: exam || null,
        level: level || null,
        unit: effectiveUnit,
        minutesPerUnit: minutesNum,
      },
      ops: diffTree(sourceId, effectiveUnit, realDraft, initial?.series ?? [], newId),
    });
  }

  const unitLabel = effectiveUnit === "ders" ? "ders" : effectiveUnit;

  return (
    <Card as="section" aria-label={initial ? "Kaynağı düzenle" : "Yeni kaynak"}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Tür">
          {(p) => (
            <SelectInput {...p} size="sm" value={kind} onChange={(e) => setKind(e.target.value as SourceKind)}>
              {(Object.keys(KIND_LABELS) as SourceKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label="Ad" className="col-span-1 md:col-span-3">
          {(p) => (
            <TextInput
              {...p}
              size="sm"
              autoFocus={!initial}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === "video" ? "X Akademi AYT Fizik Kursu" : "BilgiSarmal AYT Fizik SB"}
            />
          )}
        </Field>
        <Field label="Yayın">
          {(p) => <TextInput {...p} size="sm" maxLength={80} value={publisher} onChange={(e) => setPublisher(e.target.value)} />}
        </Field>
        <Field label="Ders">
          {(p) => (
            <>
              <TextInput
                {...p}
                size="sm"
                list="kaynak-dersler"
                maxLength={60}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Fizik"
              />
              <datalist id="kaynak-dersler">
                {SUBJECTS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Sınav">
          {(p) => (
            <SelectInput {...p} size="sm" value={exam} onChange={(e) => setExam(e.target.value as Exam | "")}>
              <option value="">—</option>
              {EXAMS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label="Seviye">
          {(p) => (
            <SelectInput {...p} size="sm" value={level} onChange={(e) => setLevel(e.target.value as Level | "")}>
              <option value="">—</option>
              {(Object.keys(LEVEL_LABELS) as Level[]).map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label="Birim">
          {(p) =>
            kind === "video" ? (
              <TextInput {...p} size="sm" value="ders" disabled readOnly />
            ) : (
              <SelectInput {...p} size="sm" value={unit} onChange={(e) => setUnit(e.target.value as SourceUnit)}>
                {BOOK_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </SelectInput>
            )
          }
        </Field>
        <Field label={`Birim başına dk`} error={minutesValid ? undefined : "0–600 arası"}>
          {(p) => (
            <TextInput
              {...p}
              size="sm"
              inputMode="decimal"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder={effectiveUnit === "test" ? "20" : effectiveUnit === "ders" ? "45" : "3"}
            />
          )}
        </Field>
        <span className="hidden md:block" />

        <Field
          label="İçindekiler"
          hint={
            kind === "video"
              ? "Her satır bir bölüm: '12 | Konu' (ders no) ya da 'Konu | 10-14'."
              : "Her satır bir bölüm: 'Konu | 1-74' ya da 'Konu | 8 test'. '# Seri' yeni seri açar, '7 = Konu' teste konu verir."
          }
          className="col-span-2 md:col-span-4"
        >
          {(p) => (
            <TextArea
              {...p}
              rows={Math.min(14, Math.max(5, toc.split("\n").length + 1))}
              className="font-mono text-[length:var(--text-sm)]"
              value={toc}
              onChange={(e) => {
                setToc(e.target.value);
                setConfirmLoss(false);
              }}
              placeholder={PLACEHOLDER[kind]}
              spellCheck={false}
            />
          )}
        </Field>

        {parsed.errors.length > 0 && (
          <ul className="col-span-2 flex flex-col gap-0.5 text-[length:var(--text-sm)] text-[var(--color-danger)] md:col-span-4">
            {parsed.errors.map((e) => (
              <li key={`${e.line}-${e.message}`}>
                Satır {e.line}: {e.message}
              </li>
            ))}
          </ul>
        )}

        {draft.length > 0 && (
          <div className="col-span-2 overflow-x-auto md:col-span-4">
            <table className="w-full min-w-[34rem] text-left text-[length:var(--text-sm)]">
              <thead className="text-[length:var(--text-2xs)] uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
                <tr>
                  <th className="py-1 pr-2 font-medium">Bölüm</th>
                  <th className="py-1 pr-2 font-medium">Aralık</th>
                  <th className="py-1 pr-2 font-medium">Konu</th>
                </tr>
              </thead>
              <tbody>
                {draft.map((s) => (
                  <SeriesRows
                    key={`${s.name}-${s.line}`}
                    series={s}
                    unitLabel={unitLabel}
                    topics={scopedTopics}
                    topicName={topicName}
                    canAddTopic={Boolean(scope.subject && scope.exam)}
                    addPending={addTopic.isPending}
                    onKind={(k) => setKindOverrides((o) => ({ ...o, [topicKey(s.name)]: k }))}
                    onTopic={(label, id) => setTopicOverrides((o) => ({ ...o, [sectionKey(s.name, label)]: id }))}
                    onAddTopic={(name, label) =>
                      scope.subject &&
                      scope.exam &&
                      addTopic.mutate(
                        { subject: scope.subject, exam: scope.exam, name },
                        {
                          onSuccess: (t) =>
                            label !== null &&
                            setTopicOverrides((o) => ({ ...o, [sectionKey(s.name, label)]: t.id })),
                        },
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {needsConfirm && (
          <p className="col-span-2 rounded-md border border-[color-mix(in_oklch,var(--color-warn)_45%,transparent)] bg-[color-mix(in_oklch,var(--color-warn)_10%,transparent)] px-3 py-2 text-[length:var(--text-sm)] md:col-span-4">
            Göreve bağlı {loss.items > 0 ? `${loss.items} test` : ""}
            {loss.items > 0 && loss.sections > 0 ? " ve " : ""}
            {loss.sections > 0 ? `${loss.sections} bölüm` : ""} silinecek; o görevler kaynak bağını kaybeder.
            {confirmLoss ? " Onaylamak için yeniden Kaydet'e bas." : ""}
          </p>
        )}

        <div className="col-span-2 flex items-center gap-2 md:col-span-4">
          {onArchive && (
            <Button type="button" size="sm" variant="danger" onClick={onArchive}>
              Arşivle
            </Button>
          )}
          <span className="flex-1" />
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
          <Button type="submit" size="sm" variant="primary" disabled={!valid} loading={pending}>
            {needsConfirm && confirmLoss ? "Yine de kaydet" : "Kaydet"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SeriesRows({
  series,
  unitLabel,
  topics,
  topicName,
  canAddTopic,
  addPending,
  onKind,
  onTopic,
  onAddTopic,
}: {
  series: ReturnType<typeof buildDraft>[number];
  unitLabel: string;
  topics: readonly Topic[];
  topicName: ReadonlyMap<string, string>;
  canAddTopic: boolean;
  addPending: boolean;
  onKind: (k: SeriesKind) => void;
  onTopic: (label: string, topicId: string | null) => void;
  onAddTopic: (name: string, label: string | null) => void;
}) {
  return (
    <>
      <tr className="border-t border-[var(--color-line)]">
        <td colSpan={3} className="pt-2 pb-1">
          <span className="font-medium">{series.name}</span>
          <select
            aria-label={`${series.name} seri türü`}
            value={series.kind}
            onChange={(e) => onKind(e.target.value as SeriesKind)}
            className="ml-2 rounded border border-[var(--color-line-2)] bg-[var(--color-surface-2)] px-1 text-[length:var(--text-2xs)]"
          >
            {(Object.keys(SERIES_KIND_LABELS) as SeriesKind[]).map((k) => (
              <option key={k} value={k}>
                {SERIES_KIND_LABELS[k]}
              </option>
            ))}
          </select>
          {!series.existing && <NewBadge />}
        </td>
      </tr>
      {series.sections.map((sec) => (
        <tr key={`${sec.label}-${sec.line}`}>
          <td className="py-1 pr-2 pl-3">
            {sec.implicit ? <span className="text-[var(--color-ink-3)]">(tüm seri)</span> : sec.label}
            {!sec.existing && series.existing && <NewBadge />}
          </td>
          <td className="py-1 pr-2 tabular-nums text-[var(--color-ink-2)]">
            {sec.from === sec.to ? sec.from : `${sec.from}-${sec.to}`}{" "}
            <span className="text-[var(--color-ink-3)]">
              ({sec.to - sec.from + 1} {unitLabel})
            </span>
          </td>
          <td className="py-1 pr-2">
            {sec.implicit ? (
              <span className="text-[var(--color-ink-3)]">—</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <select
                  aria-label={`${sec.label} konusu`}
                  value={sec.topicId ?? ""}
                  onChange={(e) => onTopic(sec.label, e.target.value || null)}
                  className={cn(
                    "max-w-[14rem] rounded border bg-[var(--color-surface-2)] px-1 py-0.5 text-[length:var(--text-sm)]",
                    sec.topicId ? "border-[var(--color-line-2)]" : "border-[var(--color-warn)]",
                  )}
                >
                  <option value="">— konusuz —</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.exam ? ` (${t.exam})` : ""}
                    </option>
                  ))}
                </select>
                {!sec.topicId && (
                  <button
                    type="button"
                    disabled={!canAddTopic || addPending}
                    title={canAddTopic ? `"${sec.label}" konusunu listeye ekle` : "Önce ders ve sınavı seç"}
                    onClick={() => onAddTopic(sec.label, sec.label)}
                    className="shrink-0 rounded-full border border-[var(--color-warn)] px-2 text-[length:var(--text-2xs)] text-[var(--color-warn)] disabled:opacity-50"
                  >
                    yeni konu · ekle
                  </button>
                )}
              </div>
            )}
          </td>
        </tr>
      ))}
      {series.itemTopics.map((t) => (
        <tr key={`it-${t.number}`}>
          <td className="py-0.5 pr-2 pl-6 text-[var(--color-ink-2)]">
            {t.number}. test
          </td>
          <td />
          <td className="py-0.5 pr-2">
            {t.topicId ? (
              topicName.get(t.topicId)
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[var(--color-warn)]">{t.topicName}</span>
                <button
                  type="button"
                  disabled={!canAddTopic || addPending}
                  onClick={() => onAddTopic(t.topicName, null)}
                  className="rounded-full border border-[var(--color-warn)] px-2 text-[length:var(--text-2xs)] text-[var(--color-warn)] disabled:opacity-50"
                >
                  yeni konu · ekle
                </button>
              </span>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}

function NewBadge() {
  return (
    <span className="ml-1.5 rounded-full bg-[var(--color-surface-3)] px-1.5 text-[length:var(--text-2xs)] text-[var(--color-ink-2)]">
      yeni
    </span>
  );
}
