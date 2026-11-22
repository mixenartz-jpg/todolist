"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { ScreenBody } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { SkeletonList } from "@/components/Skeleton";
import { todayStr } from "@/lib/date/date";
import { formatRelativeDay } from "@/lib/ui/tr";
import { KindIcon, percent, StatusBadge, SummaryBar } from "./ui";
import { PACE_WINDOW_DAYS, trackSources, type SourceTrack } from "./track";
import { useSourceProgress } from "./useSourceProgress";

/**
 * Kaynak takip: kütüphanenin (Kaynaklar) TEMPO görünümü. Kaynaklar
 * listesi ne olduğunu ve yüzdeyi söyler; burası "nasıl gidiyor"u:
 * kalan birim, son iki haftada çözülen, son çalışma ve bu tempoyla
 * bitişe kaç gün kaldığı. Ders başına toplam çubuk en üstte.
 *
 * Bitmiş kaynaklar varsayılan olarak gizli — takip edilecek bir şey yok.
 */
export function SourceTrackScreen() {
  const { progress, loading } = useSourceProgress();
  const [showDone, setShowDone] = useState(false);
  const today = todayStr();
  const groups = useMemo(() => trackSources([...progress.values()], today), [progress, today]);
  const doneCount = groups.reduce((n, g) => n + g.rows.filter((r) => r.p.source.status === "bitti").length, 0);

  return (
    <ScreenBody width="3xl">
      <SectionTitle>Kaynak takip</SectionTitle>

      {loading ? (
        <SkeletonList count={5} height={72} />
      ) : groups.length === 0 ? (
        <Card tone="sunken">
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            Henüz kaynak yok. <Link href="/koc/planlama/kaynaklar" className="underline">Kaynaklar</Link>dan ekle.
          </p>
        </Card>
      ) : (
        <>
          {groups.map((g) => {
            const rows = showDone ? g.rows : g.rows.filter((r) => r.p.source.status !== "bitti");
            return (
              <section key={g.subject} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-medium">{g.subject}</h2>
                  <SummaryBar summary={g.summary} className="flex-1" />
                  <span className="text-[length:var(--text-sm)] tabular-nums text-[var(--color-ink-2)]">%{percent(g.summary)}</span>
                </div>
                {rows.length === 0 ? (
                  <p className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">Bu derste kaynakların hepsi bitti.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {rows.map((r) => (
                      <TrackRow key={r.p.source.id} r={r} today={today} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          {doneCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDone(!showDone)}
              className="self-start text-[length:var(--text-sm)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              {showDone ? "Bitenleri gizle" : `Bitenleri göster (${doneCount})`}
            </button>
          )}
        </>
      )}
    </ScreenBody>
  );
}

function TrackRow({ r, today }: { r: SourceTrack; today: ReturnType<typeof todayStr> }) {
  const s = r.p.source;
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
          <p className="min-w-0 flex-1 truncate font-medium">{s.title}</p>
          <StatusBadge status={s.status} />
          <span className="shrink-0 font-semibold tabular-nums">%{percent(r.p.summary)}</span>
        </div>
        <SummaryBar summary={r.p.summary} className="mt-2" />
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[length:var(--text-sm)] sm:grid-cols-4">
          <Stat label="Kalan" value={r.p.summary.total ? `${r.remaining} ${s.unit}` : "—"} />
          <Stat label={`Son ${PACE_WINDOW_DAYS} gün`} value={r.recent ? `${r.recent} ${s.unit}` : "—"} />
          <Stat label="Son çalışma" value={r.lastDate ? formatRelativeDay(r.lastDate, today) : "—"} />
          <Stat label="Bu tempoyla" value={r.etaDays === null ? (r.remaining === 0 && r.p.summary.total ? "bitti" : "—") : `~${r.etaDays} gün`} />
        </dl>
      </Link>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
