"use client";

import { cn } from "@/lib/ui/cn";
import { formatPercent, formatShortDate, WEEKDAYS_LONG } from "@/lib/ui/tr";
import type { CoachLine } from "@/features/coach/messages";
import { trendLine, weakDayLine } from "@/features/coach/messages";
import type { OverallStats } from "./aggregate";
import type { TrendDelta } from "./trend";
import type { WeekLookback as WeekLookbackData } from "./lookback";

/**
 * Haftalık geri bakış — İstatistik ekranının koçluk bölümü.
 *
 * ── Neden burada? ──
 * İstatistik "ne oldu" ekranı; geri bakış o verinin YORUMU. Ayrı bir
 * ekran açmak, kullanıcıyı aynı sayıları iki yerde okumaya zorlardı
 * — biri grafik, öteki cümle olarak.
 *
 * ── Üç cümle, üçü de ÇÖPE ATILAN veriden ──
 * `weekdayBreakdown` hiçbir ekrandan çağrılmıyordu; `topStreak`
 * hesaplanıp çiziliyordu ama gösterilmiyordu. Koçluğun en güçlü iki
 * cümlesi sıfır yeni hesapla buradan doğuyor.
 */
export function WeekLookback({
  data,
  delta,
  breakdown,
  stats,
}: {
  data: WeekLookbackData;
  delta: TrendDelta | null;
  breakdown: ReadonlyArray<{ weekday: number; ratio: number; days: number }>;
  stats: OverallStats;
}) {
  const trend = trendLine(delta);
  const weak = weakDayLine(breakdown, WEEKDAYS_LONG);

  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
          Geçen hafta
        </h2>
        <span className="tabular shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          {formatShortDate(data.start)} – {formatShortDate(data.end)}
        </span>
      </div>

      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {/*
            `null` oran ÖLÇÜLMÜYOR demek: o hafta hiç zorunlu rutin
            yoktu. "%0" yazmak, yapılacak bir şey olmadığı hâlde
            yapılmamış gibi göstermek olurdu.
          */}
          <Stat
            label="Rutin"
            value={
              data.routineRatio === null
                ? "—"
                : formatPercent(data.routineRatio)
            }
            hint={data.routineRatio === null ? "ölçülmedi" : undefined}
          />

          <Stat
            label="Görev"
            value={
              data.taskTotal === 0
                ? "—"
                : `${data.taskDone}/${data.taskTotal}`
            }
            hint={data.taskTotal === 0 ? "iş yoktu" : undefined}
          />

          <Stat label="Kusursuz gün" value={String(data.perfectDays)} />
        </div>

        {/*
          Koçluk cümleleri. Her biri BAĞIMSIZ olarak `null`
          dönebiliyor (ölçüm yetersizse) ve o zaman hiç çizilmiyor —
          uydurma bir dolgu cümlesi yazmaktansa susmak doğru.
        */}
        {(trend || weak || stats.topStreak) && (
          <div className="mt-3.5 flex flex-col gap-2 border-t border-[var(--color-line)] pt-3.5">
            {trend && <CoachRow line={trend} />}
            {weak && <CoachRow line={weak} />}

            {/*
              `topStreak` ŞU ANA KADAR hesaplanıp atılıyordu. "En uzun
              serin Matematik'te, 18 gün" cümlesi sıfır yeni hesapla
              buradan doğuyor.
            */}
            {stats.topStreak && stats.topStreak.streak.current > 0 && (
              <p className="text-[length:var(--text-xs)] leading-relaxed text-[var(--color-ink-3)]">
                En uzun serin{" "}
                <span className="text-[var(--color-ink-2)]">
                  {stats.topStreak.routine.name}
                </span>
                : {stats.topStreak.streak.current}{" "}
                {stats.topStreak.streak.unit === "day"
                  ? "gün"
                  : stats.topStreak.streak.unit === "week"
                    ? "hafta"
                    : "ay"}
                .
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function CoachRow({ line }: { line: CoachLine }) {
  return (
    <p
      className={cn(
        "text-[length:var(--text-xs)] leading-relaxed",
        line.tone === "warn"
          ? "text-[var(--color-warn)]"
          : "text-[var(--color-ink-3)]",
      )}
    >
      <span
        className={cn(
          line.tone === "good" && "text-[var(--color-accent)]",
          line.tone !== "warn" && "text-[var(--color-ink-2)]",
        )}
      >
        {line.headline}
      </span>
      {line.detail ? ` — ${line.detail}` : ""}
    </p>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        {label}
      </p>
      <p className="tabular mt-0.5 text-[length:var(--text-lg)] font-semibold tracking-[-0.01em]">
        {value}
      </p>
      {hint && (
        <p className="text-[length:var(--text-2xs)] text-[var(--color-ink-4)]">
          {hint}
        </p>
      )}
    </div>
  );
}
