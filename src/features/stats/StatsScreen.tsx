"use client";

import { useMemo, useState } from "react";
import { minDate, todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatPercent } from "@/lib/ui/tr";
import { Screen, ScreenHeader, ScreenBody } from "@/components/Screen";
import { EmptyState } from "@/components/EmptyState";
import { ChartIcon } from "@/components/icons";
import { EMPTY_ENTRIES, useEntries } from "@/features/entries/queries";
import { useRoutines } from "@/features/routines/queries";
import {
  heatmapData,
  overallStats,
  relevantRoutines,
  routineSummaries,
  weeklyTrend,
} from "./aggregate";
import { heatmapStart, RANGE_OPTIONS, rangeStart, type RangeKey } from "./range";
import { recentHistory } from "./streak";
import { RoutineBreakdown } from "./RoutineBreakdown";
import { StreakCard } from "./StreakCard";
import { TrendChart } from "./TrendChart";
import { YearHeatmap } from "./YearHeatmap";

const HISTORY_DAYS = 14;

export function StatsScreen() {
  const today = useMemo(() => todayStr(), []);
  const [range, setRange] = useState<RangeKey>("90g");

  const routinesQuery = useRoutines();
  const allRoutines = routinesQuery.data;

  const earliestStart = useMemo((): DateStr | null => {
    if (!allRoutines || allRoutines.length === 0) return null;
    return allRoutines.reduce(
      (min, r) => minDate(min, r.startDate),
      allRoutines[0].startDate,
    );
  }, [allRoutines]);

  const from = rangeStart(range, today, earliestStart);

  // Isı haritası daima son 52 haftayı gösterir; sorgu aralığı seçili
  // filtre ile ısı haritasının ikisini birden kapsamalı.
  const heatFrom = heatmapStart(today);
  const queryFrom = minDate(from, heatFrom);

  const entriesQuery = useEntries(queryFrom, today);
  const entries = entriesQuery.data ?? EMPTY_ENTRIES;

  const routines = useMemo(
    () => relevantRoutines(allRoutines ?? [], from, today),
    [allRoutines, from, today],
  );

  const overall = useMemo(
    () => overallStats(entries, routines, from, today, today),
    [entries, routines, from, today],
  );

  const summaries = useMemo(
    () => routineSummaries(entries, routines, from, today, today),
    [entries, routines, from, today],
  );

  const trend = useMemo(
    () => weeklyTrend(entries, routines, from, today),
    [entries, routines, from, today],
  );

  const heat = useMemo(
    () => heatmapData(entries, routines, heatFrom, today, today),
    [entries, routines, heatFrom, today],
  );

  // Seri kartları: yalnızca serisi olan rutinler, uzundan kısaya.
  // Sıfır serili sekiz kart göstermek ekranı boş bir listeye çevirir.
  const streakCards = useMemo(
    () =>
      summaries
        .filter((s) => s.streak.current > 0)
        .sort((a, b) => b.streak.current - a.streak.current)
        .slice(0, 6),
    [summaries],
  );

  const isLoading = routinesQuery.isPending;

  if (!isLoading && (allRoutines ?? []).length === 0) {
    return (
      <Screen>
        <ScreenHeader title="İstatistik" width="3xl" />
        <EmptyState
          icon={<ChartIcon size={22} />}
          title="Henüz veri yok"
          description="Rutin ekleyip birkaç gün işaretledikten sonra burada serilerini, tamamlanma oranlarını ve yıllık ısı haritanı göreceksin."
          actionLabel="Rutin ekle"
          actionHref="/rutinler"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="İstatistik" width="3xl" />

      <ScreenBody width="3xl">
        {/* Tek filtre satırı, kapsadığı her şeyin üstünde. Grafik
            başına ayrı filtre, kartların farklı dönemleri göstermesine
            ve karşılaştırmanın anlamsızlaşmasına yol açar. */}
        <RangeFilter value={range} onChange={setRange} />

        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <>
            <SummaryRow
              rate={overall.rate}
              perfectDays={overall.perfectDays}
              activeDays={overall.activeDays}
              bestDayStreak={overall.bestDayStreak}
            />

            {streakCards.length > 0 && (
              <section>
                <h2 className="mb-2.5 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
                  Süren seriler
                </h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
                  {streakCards.map((s) => (
                    <StreakCard
                      key={s.routine.id}
                      routine={s.routine}
                      streak={s.streak}
                      history={recentHistory(entries, s.routine, today, HISTORY_DAYS)}
                    />
                  ))}
                </div>
              </section>
            )}

            <TrendChart points={trend} />
            <YearHeatmap from={heatFrom} to={today} data={heat} />
            <RoutineBreakdown summaries={summaries} today={today} />
          </>
        )}
      </ScreenBody>
    </Screen>
  );
}

function RangeFilter({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (key: RangeKey) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Tarih aralığı"
      className="flex gap-1 self-start rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-1"
    >
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={value === option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[length:var(--text-sm)]",
            "transition-colors duration-[var(--duration-fast)]",
            value === option.key
              ? "bg-[var(--color-surface-3)] text-[var(--color-ink)]"
              : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Özet sayılar — stat tile satırı.
 *
 * Bunlar tek değerlerdir; tek çubuklu bir bar grafik olmamalılar.
 * Sayılar `tabular-nums` KULLANMAZ: eşit genişlikli rakamlar büyük
 * puntoda gevşek görünür.
 */
function SummaryRow({
  rate,
  perfectDays,
  activeDays,
  bestDayStreak,
}: {
  rate: number;
  perfectDays: number;
  activeDays: number;
  bestDayStreak: number;
}) {
  const tiles = [
    { label: "Tamamlanma", value: formatPercent(rate) },
    { label: "Kusursuz gün", value: String(perfectDays), hint: `${activeDays} günde` },
    { label: "En iyi gün serisi", value: String(bestDayStreak), hint: "gün" },
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3"
        >
          <div className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {tile.label}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[length:var(--text-3xl)] font-semibold leading-none tracking-[-0.02em]">
              {tile.value}
            </span>
            {tile.hint && (
              <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                {tile.hint}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[72, 180, 200, 240].map((height, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl bg-[var(--color-surface-2)]"
          style={{ height, animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}
