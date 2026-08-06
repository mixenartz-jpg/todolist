"use client";

import { useId, useMemo, useState } from "react";
import { formatPercent, formatShortDate } from "@/lib/ui/tr";
import type { WeekPoint } from "./aggregate";

interface TrendChartProps {
  points: WeekPoint[];
}

const VIEW_W = 720;
const VIEW_H = 200;
const PAD = { top: 14, right: 16, bottom: 26, left: 34 };

/**
 * Haftalık tamamlanma trendi — tek seri çizgi.
 *
 * Elle SVG: tek seri için bir grafik kütüphanesi fazlalık olur ve
 * mark spec'lerini (2px çizgi, ≥8px uç işareti, hairline solid grid)
 * doğrudan kontrol etmek daha güvenilir.
 *
 * Legend YOK — tek seride başlık zaten ne çizildiğini söyler; tek
 * örnekli bir legend kutusu başlığı tekrar eder ve yer harcar.
 * Etiket SEÇİCİ: yalnızca son nokta ve en yüksek nokta yazılır;
 * her noktaya sayı koymak okunmayan bir gürültü yaratır.
 */
export function TrendChart({ points }: TrendChartProps) {
  const [showTable, setShowTable] = useState(false);
  const gradientId = useId();

  const geometry = useMemo(() => {
    if (points.length === 0) return null;

    const plotW = VIEW_W - PAD.left - PAD.right;
    const plotH = VIEW_H - PAD.top - PAD.bottom;

    // Y ekseni daima 0-100: oran verisi kendi maksimumuna göre
    // ölçeklenirse %40'lık bir hafta tavana değer ve iyi görünür.
    const x = (index: number) =>
      points.length === 1
        ? PAD.left + plotW / 2
        : PAD.left + (index / (points.length - 1)) * plotW;
    const y = (ratio: number) => PAD.top + (1 - ratio) * plotH;

    const coords = points.map((p, i) => ({ x: x(i), y: y(p.ratio), point: p }));
    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const area =
      `${line} L${coords[coords.length - 1].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)}` +
      ` L${coords[0].x.toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`;

    const peakIndex = points.reduce(
      (best, p, i) => (p.ratio > points[best].ratio ? i : best),
      0,
    );

    return { coords, line, area, plotH, peakIndex };
  }, [points]);

  if (points.length === 0 || geometry === null) {
    return (
      <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <h2 className="text-[length:var(--text-base)] font-medium">
          Haftalık tamamlanma
        </h2>
        <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          Trend için henüz yeterli veri yok. Birkaç gün işaretledikten sonra
          burada haftalık gidişatını göreceksin.
        </p>
      </section>
    );
  }

  const { coords, line, area, plotH, peakIndex } = geometry;
  const last = coords[coords.length - 1];
  const peak = coords[peakIndex];
  const average =
    points.reduce((sum, p) => sum + p.ratio, 0) / points.length;

  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <header className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[length:var(--text-base)] font-medium">
          Haftalık tamamlanma
        </h2>
        <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          {points.length} hafta · ortalama {formatPercent(average)}
        </p>
      </header>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        style={{ height: "auto" }}
        role="img"
        aria-label={`Haftalık tamamlanma trendi. ${points.length} hafta, ortalama ${formatPercent(average)}. Son hafta ${formatPercent(last.point.ratio)}.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {/* Alan dolgusu: seri renginin ~%10'u — doygun blok değil, bir yıkama. */}
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Yatay ızgara: hairline, SOLID (kesikli değil), geri planda. */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const yPos = PAD.top + (1 - tick) * plotH;
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                y1={yPos}
                x2={VIEW_W - PAD.right}
                y2={yPos}
                stroke="var(--color-line)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 7}
                y={yPos + 3.5}
                textAnchor="end"
                className="tabular"
                fill="var(--color-ink-3)"
                fontSize="10"
              >
                {Math.round(tick * 100)}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Uç işareti: ≥8px çap, yüzey renginde 2px halka ile. */}
        <circle
          cx={last.x}
          cy={last.y}
          r="4.5"
          fill="var(--color-accent)"
          stroke="var(--color-surface)"
          strokeWidth="2"
        />

        {/* Seçici etiket: yalnızca son nokta ve zirve. */}
        <text
          x={Math.min(last.x, VIEW_W - PAD.right - 4)}
          y={Math.max(last.y - 11, PAD.top + 8)}
          textAnchor="end"
          fill="var(--color-ink-2)"
          fontSize="11"
          fontWeight="500"
        >
          {formatPercent(last.point.ratio)}
        </text>

        {peakIndex !== points.length - 1 && peak.point.ratio > last.point.ratio && (
          <>
            <circle cx={peak.x} cy={peak.y} r="3" fill="var(--color-ink-3)" />
            <text
              x={peak.x}
              y={Math.max(peak.y - 9, PAD.top + 8)}
              textAnchor="middle"
              fill="var(--color-ink-3)"
              fontSize="10"
            >
              {formatPercent(peak.point.ratio)}
            </text>
          </>
        )}

        {/* X ekseni: yalnızca ilk ve son hafta — her haftayı yazmak okunmaz. */}
        <text
          x={PAD.left}
          y={VIEW_H - 8}
          fill="var(--color-ink-3)"
          fontSize="10"
        >
          {formatShortDate(points[0].start)}
        </text>
        <text
          x={VIEW_W - PAD.right}
          y={VIEW_H - 8}
          textAnchor="end"
          fill="var(--color-ink-3)"
          fontSize="10"
        >
          {formatShortDate(points[points.length - 1].start)}
        </text>
      </svg>

      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        className="mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)] underline-offset-2 transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-ink-2)] hover:underline"
      >
        {showTable ? "Tabloyu gizle" : "Tablo olarak gör"}
      </button>

      {showTable && <TrendTable points={points} />}
    </section>
  );
}

/** Grafiğin WCAG-temiz eşdeğeri — hiçbir değer yalnızca renge bağlı değil. */
function TrendTable({ points }: { points: WeekPoint[] }) {
  return (
    <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-[var(--color-line)]">
      <table className="w-full text-[length:var(--text-sm)]">
        <caption className="sr-only">Haftalık tamamlanma oranları</caption>
        <thead className="sticky top-0 bg-[var(--color-surface-2)]">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium text-[var(--color-ink-2)]">
              Hafta
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium text-[var(--color-ink-2)]">
              Tamamlanma
            </th>
          </tr>
        </thead>
        <tbody>
          {[...points].reverse().map((p) => (
            <tr key={p.key} className="border-t border-[var(--color-line)]">
              <td className="px-3 py-1.5 text-[var(--color-ink-2)]">
                {formatShortDate(p.start)} – {formatShortDate(p.end)}
              </td>
              <td className="tabular px-3 py-1.5 text-right">
                {formatPercent(p.ratio)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
