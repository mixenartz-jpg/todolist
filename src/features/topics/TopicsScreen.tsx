"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Card } from "@/components/Card";
import { SelectInput } from "@/components/Field";
import { ScreenBody } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { SkeletonList } from "@/components/Skeleton";
import { Toast, useToast } from "@/components/Toast";
import { TOPIC_THRESHOLDS } from "@/features/alerts/thresholds";
import { useSchoolStatus, useSetSchoolStatus } from "@/features/school/queries";
import {
  filterTopics,
  parseTopicFilter,
  SCHOOL_LABELS,
  schoolGap,
  schoolSummary,
  TOPIC_FILTERS,
  type SchoolMark,
  type SchoolStatus,
} from "@/features/school/school";
import { EXAMS } from "@/features/sources/types";
import { useSourceProgress } from "@/features/sources/useSourceProgress";
import { todayStr } from "@/lib/date/date";
import { formatShortDate } from "@/lib/ui/tr";
import { cn } from "@/lib/ui/cn";
import { topicStats, type TopicStats, type TopicStatus } from "./stats";

const STATUS: Record<TopicStatus, { label: string; color: string }> = {
  none: { label: "Başlanmadı", color: "var(--color-ink-4)" },
  working: { label: "Çalışılıyor", color: "var(--color-warn)" },
  good: { label: "İyi", color: "var(--color-good)" },
  weak: { label: "Zayıf", color: "var(--color-danger)" },
};

/**
 * Ders takip: ders seçilir, konu listesi gelir. Her konuda iki taraf
 * yan yana durur:
 *
 *   · okul nerede — koçun işaretlediği "işleniyor / işlendi" (0040)
 *   · öğrenci nerede — tüm kaynaklardan çözülen, doğruluk, video,
 *     son çalışma (`topicStats`)
 *
 * İkisi ayrışınca satır işaretlenir: okulda işlenmiş ama öğrencinin
 * başlamadığı ya da zayıf kaldığı konu "geride" sayılır ve süzgeçle
 * tek başına listelenebilir.
 */
export function TopicsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { topics, progress, index, results, loading } = useSourceProgress();
  const schoolQuery = useSchoolStatus();
  const setSchool = useSetSchoolStatus(toast.show);
  const marks = useMemo(() => schoolQuery.data ?? new Map<string, SchoolMark>(), [schoolQuery.data]);

  const subjects = useMemo(() => [...new Set(topics.map((t) => t.subject))].sort((a, b) => a.localeCompare(b, "tr")), [topics]);
  const subject = params.get("ders") ?? subjects[0] ?? "";
  const exam = params.get("sinav");
  const focus = params.get("konu");
  const filter = parseTopicFilter(params.get("goster"));

  const stats = useMemo(
    () => topicStats(topics, [...progress.values()], index, results, { subject: subject || null, exam }),
    [topics, progress, index, results, subject, exam],
  );
  const visible = useMemo(() => filterTopics(stats, marks, filter), [stats, marks, filter]);
  const summary = useMemo(() => schoolSummary(stats, marks), [stats, marks]);

  useEffect(() => {
    if (!focus) return;
    document.getElementById(`konu-${focus}`)?.scrollIntoView({ block: "center" });
  }, [focus, visible.length]);

  function setParam(key: string, value: string | null) {
    const q = new URLSearchParams(params.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    if (key !== "konu") q.delete("konu");
    router.replace(`${pathname}?${q.toString()}`);
  }

  function onSchool(topicId: string, status: SchoolStatus | null) {
    const prev = marks.get(topicId);
    // İşlendi: tarih bugün; önceden işlendiyse eski tarih korunur.
    const coveredOn = status === "done" ? (prev?.status === "done" && prev.coveredOn ? prev.coveredOn : todayStr()) : null;
    setSchool.mutate({ topicId, status, coveredOn });
  }

  const counts = stats.reduce(
    (m, s) => ({ ...m, [s.status]: (m[s.status] ?? 0) + 1 }),
    {} as Partial<Record<TopicStatus, number>>,
  );
  const busy = loading || schoolQuery.isPending;
  const schoolPct = summary.total ? (summary.done / summary.total) * 100 : 0;

  return (
    <ScreenBody width="3xl">
      <SectionTitle>Ders takip</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <SelectInput size="sm" aria-label="Ders" value={subject} onChange={(e) => setParam("ders", e.target.value)}>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectInput>
        <SelectInput size="sm" aria-label="Sınav" value={exam ?? ""} onChange={(e) => setParam("sinav", e.target.value || null)}>
          <option value="">Tüm sınavlar</option>
          {EXAMS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </SelectInput>
      </div>

      {!busy && stats.length > 0 && (
        <Card>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-medium">Okul nerede</p>
              <p className="text-[length:var(--text-sm)] tabular-nums text-[var(--color-ink-2)]">
                {summary.done}/{summary.total} konu işlendi
              </p>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
              role="img"
              aria-label={`Okulda ${summary.done}/${summary.total} konu işlendi`}
            >
              <div className="h-full bg-[var(--color-accent)]" style={{ width: `${schoolPct}%` }} />
            </div>
            <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              Şu an: {summary.current.length > 0 ? summary.current.map((t) => t.name).join(", ") : "—"}
              {summary.behind > 0 && (
                <span className="ml-2 text-[var(--color-danger)]">· {summary.behind} konuda öğrenci geride</span>
              )}
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--color-line)] pt-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              {(Object.keys(STATUS) as TopicStatus[]).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <Dot status={k} /> {STATUS[k].label} {counts[k] ?? 0}
                </span>
              ))}
              <span className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                iyi: son {TOPIC_THRESHOLDS.recentCount} sonuç ≥ %{TOPIC_THRESHOLDS.good * 100} · zayıf: &lt; %
                {TOPIC_THRESHOLDS.weak * 100}
              </span>
            </p>
          </div>
        </Card>
      )}

      {!busy && stats.length > 0 && (
        <div role="group" aria-label="Konuları süz" className="flex flex-wrap gap-1.5">
          {TOPIC_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setParam("goster", f.id === "all" ? null : f.id)}
              className={cn(
                "h-8 rounded-full border px-3 text-[length:var(--text-xs)]",
                "transition-colors duration-[var(--duration-fast)]",
                filter === f.id
                  ? "border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_12%,transparent)] text-[var(--color-ink)]"
                  : "border-[var(--color-line)] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
              )}
            >
              {f.label}
              {f.id === "behind" && summary.behind > 0 && <span className="ml-1 tabular-nums">{summary.behind}</span>}
            </button>
          ))}
        </div>
      )}

      {busy ? (
        <SkeletonList count={6} height={64} />
      ) : stats.length === 0 ? (
        <Card tone="sunken">
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">Bu derste konu yok.</p>
        </Card>
      ) : visible.length === 0 ? (
        <Card tone="sunken">
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">Bu süzgece uyan konu yok.</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((s) => (
            <TopicRow
              key={s.topic.id}
              s={s}
              mark={marks.get(s.topic.id)}
              focused={s.topic.id === focus}
              onSchool={(status) => onSchool(s.topic.id, status)}
            />
          ))}
        </ul>
      )}

      <Toast message={toast.message} variant={toast.variant} token={toast.token} onDismiss={toast.dismiss} />
    </ScreenBody>
  );
}

function Dot({ status }: { status: TopicStatus }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: STATUS[status].color }} />;
}

const SCHOOL_OPTIONS: ReadonlyArray<{ value: SchoolStatus | null; label: string }> = [
  { value: null, label: SCHOOL_LABELS.none },
  { value: "current", label: SCHOOL_LABELS.current },
  { value: "done", label: SCHOOL_LABELS.done },
];

function SchoolToggle({
  value,
  topicName,
  onChange,
}: {
  value: SchoolStatus | null;
  topicName: string;
  onChange: (next: SchoolStatus | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`${topicName}: okulda`}
      className="flex shrink-0 items-center gap-0.5 rounded-lg bg-[var(--color-surface-2)] p-0.5"
    >
      {SCHOOL_OPTIONS.map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => value !== o.value && onChange(o.value)}
          className={cn(
            "min-h-7 rounded-md px-2 py-1 text-[length:var(--text-2xs)]",
            "transition-colors duration-[var(--duration-fast)]",
            value === o.value
              ? "bg-[var(--color-surface-3)] font-medium text-[var(--color-ink)]"
              : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TopicRow({
  s,
  mark,
  focused,
  onSchool,
}: {
  s: TopicStats;
  mark: SchoolMark | undefined;
  focused: boolean;
  onSchool: (status: SchoolStatus | null) => void;
}) {
  const pct = (x: number | null) => (x === null ? "—" : `%${Math.round(x * 100)}`);
  const books = s.sources.filter((x) => x.kind === "kitap");
  const videos = s.sources.filter((x) => x.kind === "video");
  const gap = schoolGap(s, mark);
  return (
    <li
      id={`konu-${s.topic.id}`}
      className={cn(
        "rounded-xl border bg-[var(--color-surface)] p-3",
        focused
          ? "border-[var(--color-accent)]"
          : gap === "behind"
            ? "border-[color-mix(in_oklch,var(--color-danger)_55%,transparent)]"
            : "border-[var(--color-line)]",
      )}
    >
      <div className="flex items-baseline gap-2">
        <Dot status={s.status} />
        <p className="min-w-0 flex-1 font-medium">
          {s.topic.name}
          <span className="ml-1.5 text-[length:var(--text-2xs)] font-normal text-[var(--color-ink-3)]">{s.topic.exam}</span>
        </p>
        <span className="text-[length:var(--text-2xs)] font-medium" style={{ color: STATUS[s.status].color }}>
          {STATUS[s.status].label}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">Okulda</span>
        <SchoolToggle value={mark?.status ?? null} topicName={s.topic.name} onChange={onSchool} />
        {mark?.status === "done" && mark.coveredOn && (
          <span className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">{formatShortDate(mark.coveredOn)}</span>
        )}
        {gap === "behind" && (
          <span className="text-[length:var(--text-2xs)] font-medium text-[var(--color-danger)]">Öğrenci geride</span>
        )}
        {gap === "ahead" && (
          <span className="text-[length:var(--text-2xs)] font-medium text-[var(--color-good)]">Okuldan önde</span>
        )}
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[length:var(--text-sm)] sm:grid-cols-4">
        <Stat label="Çözülen" value={s.total ? `${s.solved}/${s.total}` : "—"} />
        <Stat label="Doğruluk" value={pct(s.accuracy)} hint={s.correct + s.wrong ? `${s.correct}D ${s.wrong}Y` : undefined} />
        <Stat label="Video" value={s.video ? `${s.video.watched}/${s.video.total} ders` : "—"} />
        <Stat label="Son çalışma" value={s.lastDate ? formatShortDate(s.lastDate) : "—"} />
      </dl>
      {(books.length > 0 || videos.length > 0) && (
        <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
          {[...books, ...videos].map((x) => (
            <Link key={x.sourceId} href={`/koc/planlama/kaynaklar/${x.sourceId}`} className="hover:text-[var(--color-ink)] hover:underline">
              {x.title} {x.green}/{x.total}
            </Link>
          ))}
        </p>
      )}
    </li>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">{label}</dt>
      <dd className="tabular-nums">
        {value}
        {hint && <span className="ml-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">{hint}</span>}
      </dd>
    </div>
  );
}
