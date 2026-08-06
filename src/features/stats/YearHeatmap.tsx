"use client";

import { useMemo, useState } from "react";
import { addDays, eachDay, isoWeekday, startOfIsoWeek, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { levelVar } from "@/lib/ui/colors";
import { cn } from "@/lib/ui/cn";
import { formatLongDate, formatPercent, MONTHS, WEEKDAYS_MIN } from "@/lib/ui/tr";
import { densityLevel } from "./score";
import "./heatmap.css";

interface YearHeatmapProps {
  from: DateStr;
  to: DateStr;
  /** Gün → oran. null = o gün iş yoktu ya da gelecek. */
  data: Map<DateStr, number | null>;
}

/**
 * Yıllık ısı haritası — 53 hafta × 7 gün.
 *
 * Renk yoğunluğu ordinal rampadan gelir (tek hue, açıklık artar).
 * Tooltip TEK okuma yolu değildir: altında bir tablo görünümü açılır
 * ve her hücre klavye ile odaklanabilir.
 */
export function YearHeatmap({ from, to, data }: YearHeatmapProps) {
  const [showTable, setShowTable] = useState(false);

  // Sütunlar = haftalar. İlk sütun `from`'u içeren ISO haftanın
  // Pazartesi'sinden başlar ki satırlar gün adlarıyla hizalansın.
  const weeks = useMemo(() => {
    const start = startOfIsoWeek(from);
    const columns: DateStr[][] = [];

    for (let cursor = start; cursor <= to; cursor = addDays(cursor, 7)) {
      columns.push(eachDay(cursor, addDays(cursor, 6)));
    }
    return columns;
  }, [from, to]);

  // Ay etiketleri: bir ayın ilk göründüğü sütuna yazılır.
  const monthLabels = useMemo(() => {
    const labels: Array<{ column: number; label: string }> = [];
    let lastMonth = -1;

    weeks.forEach((week, index) => {
      const { month } = toParts(week[0]);
      if (month !== lastMonth) {
        lastMonth = month;
        labels.push({ column: index, label: MONTHS[month].slice(0, 3) });
      }
    });
    return labels;
  }, [weeks]);

  const summary = useMemo(() => {
    let counted = 0;
    let total = 0;
    for (const ratio of data.values()) {
      if (ratio === null) continue;
      counted++;
      total += ratio;
    }
    return { days: counted, average: counted > 0 ? total / counted : 0 };
  }, [data]);

  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[length:var(--text-base)] font-medium">Son bir yıl</h2>
        <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          {summary.days} gün · ortalama {formatPercent(summary.average)}
        </p>
      </header>

      <div className="heatmapScroll">
        <div className="heatmapInner">
          <div className="heatmapMonths" style={{ ["--weeks" as string]: weeks.length }}>
            {monthLabels.map(({ column, label }) => (
              <span
                key={`${column}-${label}`}
                className="heatmapMonthLabel"
                style={{ gridColumn: column + 1 }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="heatmapBody">
            <div className="heatmapDayLabels" aria-hidden>
              {/* Yalnızca Pzt/Çrş/Cum: yedi etiket sığmaz ve gürültü olur. */}
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <span key={day} className="heatmapDayLabel">
                  {day === 1 || day === 3 || day === 5 ? WEEKDAYS_MIN[day] : ""}
                </span>
              ))}
            </div>

            <div
              className="heatmapGrid"
              style={{ ["--weeks" as string]: weeks.length }}
              role="img"
              aria-label={`Son bir yılın günlük tamamlanma ısı haritası. ${summary.days} günde ortalama ${formatPercent(summary.average)}.`}
            >
              {weeks.map((week) =>
                week.map((date) => {
                  const ratio = data.get(date);
                  const outOfRange = date < from || date > to;

                  return (
                    <span
                      key={date}
                      className={cn("heatmapCell", outOfRange && "heatmapCellHidden")}
                      style={{
                        background:
                          ratio === null || ratio === undefined
                            ? "var(--color-level-0)"
                            : levelVar(densityLevel(ratio)),
                        gridRow: isoWeekday(date),
                      }}
                      title={
                        ratio === null || ratio === undefined
                          ? formatLongDate(date)
                          : `${formatLongDate(date)}: ${formatPercent(ratio)}`
                      }
                    />
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Legend />

        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-[length:var(--text-xs)] text-[var(--color-ink-3)] underline-offset-2 transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-ink-2)] hover:underline"
        >
          {showTable ? "Tabloyu gizle" : "Tablo olarak gör"}
        </button>
      </footer>

      {showTable && <HeatmapTable data={data} />}
    </section>
  );
}

/** Rampa açıklaması — renk tek başına anlam taşımasın. */
function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
      <span>az</span>
      {([0, 1, 2, 3, 4] as const).map((level) => (
        <span
          key={level}
          className="size-[11px] rounded-[2px]"
          style={{ background: levelVar(level) }}
          aria-hidden
        />
      ))}
      <span>çok</span>
    </div>
  );
}

/**
 * Tablo görünümü — ısı haritasının WCAG-temiz eşdeğeri.
 *
 * Renkli bir sürekli ölçek tek başına erişilebilir değildir; her
 * değerin metinle de okunabilmesi gerekir.
 */
function HeatmapTable({ data }: { data: Map<DateStr, number | null> }) {
  const rows = useMemo(
    () =>
      [...data.entries()]
        .filter(([, ratio]) => ratio !== null)
        .reverse()
        .slice(0, 60) as Array<[DateStr, number]>,
    [data],
  );

  return (
    <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-[var(--color-line)]">
      <table className="w-full text-[length:var(--text-sm)]">
        <caption className="sr-only">
          Günlük tamamlanma oranları, en yeniden eskiye (son 60 gün)
        </caption>
        <thead className="sticky top-0 bg-[var(--color-surface-2)]">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium text-[var(--color-ink-2)]">
              Gün
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium text-[var(--color-ink-2)]">
              Tamamlanma
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([date, ratio]) => (
            <tr key={date} className="border-t border-[var(--color-line)]">
              <td className="px-3 py-1.5 text-[var(--color-ink-2)]">
                {formatLongDate(date)}
              </td>
              <td className="tabular px-3 py-1.5 text-right">
                {formatPercent(ratio)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
