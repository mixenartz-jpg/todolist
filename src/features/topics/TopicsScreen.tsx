"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Card } from "@/components/Card";
import { SelectInput } from "@/components/Field";
import { ScreenBody } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { SkeletonList } from "@/components/Skeleton";
import { TOPIC_THRESHOLDS } from "@/features/alerts/thresholds";
import { EXAMS } from "@/features/sources/types";
import { useSourceProgress } from "@/features/sources/useSourceProgress";
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
 * Konu takibi: ders seçilir, konu listesi gelir. Her konuda tüm
 * kaynaklardan çözülen birim, doğruluk, kaynak dağılımı, video durumu ve
 * son çalışma. Renkler `TOPIC_THRESHOLDS`'tan.
 */
export function TopicsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { topics, progress, index, results, loading } = useSourceProgress();

  const subjects = useMemo(() => [...new Set(topics.map((t) => t.subject))].sort((a, b) => a.localeCompare(b, "tr")), [topics]);
  const subject = params.get("ders") ?? subjects[0] ?? "";
  const exam = params.get("sinav");
  const focus = params.get("konu");

  const stats = useMemo(
    () => topicStats(topics, [...progress.values()], index, results, { subject: subject || null, exam }),
    [topics, progress, index, results, subject, exam],
  );

  useEffect(() => {
    if (!focus) return;
    document.getElementById(`konu-${focus}`)?.scrollIntoView({ block: "center" });
  }, [focus, stats.length]);

  function setParam(key: string, value: string | null) {
    const q = new URLSearchParams(params.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    if (key !== "konu") q.delete("konu");
    router.replace(`${pathname}?${q.toString()}`);
  }

  const counts = stats.reduce(
    (m, s) => ({ ...m, [s.status]: (m[s.status] ?? 0) + 1 }),
    {} as Partial<Record<TopicStatus, number>>,
  );

  return (
    <ScreenBody width="3xl">
      <SectionTitle>Konular</SectionTitle>
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

      {!loading && stats.length > 0 && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
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
      )}

      {loading ? (
        <SkeletonList count={6} height={64} />
      ) : stats.length === 0 ? (
        <Card tone="sunken">
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">Bu derste konu yok.</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {stats.map((s) => (
            <TopicRow key={s.topic.id} s={s} focused={s.topic.id === focus} />
          ))}
        </ul>
      )}
    </ScreenBody>
  );
}

function Dot({ status }: { status: TopicStatus }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: STATUS[status].color }} />;
}

function TopicRow({ s, focused }: { s: TopicStats; focused: boolean }) {
  const pct = (x: number | null) => (x === null ? "—" : `%${Math.round(x * 100)}`);
  const books = s.sources.filter((x) => x.kind === "kitap");
  const videos = s.sources.filter((x) => x.kind === "video");
  return (
    <li
      id={`konu-${s.topic.id}`}
      className={cn(
        "rounded-xl border bg-[var(--color-surface)] p-3",
        focused ? "border-[var(--color-accent)]" : "border-[var(--color-line)]",
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
      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[length:var(--text-sm)] sm:grid-cols-4">
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
