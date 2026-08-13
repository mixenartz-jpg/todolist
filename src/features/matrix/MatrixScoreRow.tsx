"use client";

import { isoWeekday } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatPercent, formatLongDate } from "@/lib/ui/tr";
import { cn } from "@/lib/ui/cn";
import { densityLevel, type DayScore } from "@/features/stats/score";
import { levelVar } from "@/lib/ui/colors";

/**
 * Alt satır: her günün toplam skoru.
 *
 * Yükseklik değil renk yoğunluğu kullanılır — 4 adımlı ordinal rampa,
 * takvim ve ısı haritasıyla aynı görsel dil.
 */
export function MatrixScoreRow({
  days,
  scores,
  today,
}: {
  days: DateStr[];
  scores: DayScore[];
  today: DateStr;
}) {
  return (
    <>
      <div className="nameCell scoreCell flex h-10 items-center pl-3">
        <span className="text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--color-ink-3)]">
          Günlük
        </span>
      </div>

      {days.map((date, index) => {
        const score = scores[index];
        const level = densityLevel(score.ratio);
        const isToday = date === today;
        // Gelecek günlerin skoru anlamsızdır — henüz yapılacak bir şey
        // olmadığı için hepsi %0 çıkar ve satırı yanıltıcı biçimde
        // "boş" gösterirdi.
        const isFuture = date > today;
        const hasWork = score.possible > 0 && !isFuture;

        return (
          <div
            key={date}
            className={cn(
              "scoreCell flex h-10 items-center justify-center border-r border-[var(--color-line)]",
              isToday && "todayColumn",
              isoWeekday(date) === 1 && "weekStart",
            )}
            title={
              hasWork
                ? `${formatLongDate(date)}: ${formatPercent(score.ratio)}`
                : `${formatLongDate(date)}: bugün için bir şey yok`
            }
          >
            {hasWork && (
              // Renk + sayı birlikte: yoğunluk rampası hızlı taramayı,
              // sayı kesin okumayı sağlar. Renk tek başına bilgi taşımaz.
              <span
                className="tabular flex h-5 w-7 items-center justify-center rounded-[3px] text-[length:var(--text-2xs)] leading-none"
                style={{
                  background: levelVar(level),
                  // Rampanın açık uçlarında koyu metin. `--color-on-accent`
                  // "açık dolgu üstündeki mürekkep" için var; ham zemin
                  // hex'i yazmak paleti sessizce eskitirdi.
                  color:
                    level >= 3 ? "var(--color-on-accent)" : "var(--color-ink-2)",
                }}
              >
                {Math.round(score.ratio * 100)}
              </span>
            )}
            <span className="sr-only">
              {hasWork ? formatPercent(score.ratio) : "Yok"}
            </span>
          </div>
        );
      })}
    </>
  );
}
