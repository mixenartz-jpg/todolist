"use client";

import { useMemo } from "react";
import { formatShortDate } from "@/lib/ui/tr";
import type { CizilebilirSeri, NetNoktasi } from "./denemetrend";
import { formatNet } from "./format";

const VIEW_W = 720;
const VIEW_H = 200;
const PAD = { top: 16, right: 16, bottom: 26, left: 40 };

/**
 * Net trendi — tür başına AYRI çizgi.
 *
 * ── Neden `stats/TrendChart` yeniden kullanılmıyor? ──
 * O grafik tek seri ve sabit 0–100 ekseni çiziyor (oran verisi).
 * Buradaki eksen nete göre esner ve BİRDEN ÇOK seri var. İkisini tek
 * bileşene sığdırmak, her iki tarafta da "hangi moddayım" dallanması
 * demekti — `netSerisi`'nin ayırdığı şeyi görselde birleştirmek
 * olurdu.
 *
 * ── Y ekseni neden veriye göre esniyor? ──
 * `TrendChart`'ta eksen sabit 0–100, çünkü oran verisi kendi
 * maksimumuna ölçeklenirse %40'lık bir hafta tavana değer ve iyi
 * görünür. Net için bu geçerli DEĞİL: 85–95 arasında gezinen bir
 * TYT serisini 0–120 ekseninde çizmek gerçek ilerlemeyi düz bir
 * çizgiye ezerdi. Eksen veriye oturur ama SIFIRI DA İÇERİR
 * (aşağıda) ki küçük farklar dramatik görünmesin.
 */
export function NetTrendChart({ seriler }: { seriler: CizilebilirSeri[] }) {
  const geometry = useMemo(() => hesaplaGeometri(seriler), [seriler]);

  if (geometry === null) return null;

  const { ciziler, ekseni } = geometry;

  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[length:var(--text-base)] font-medium">
          Net trendi
        </h2>

        {/*
         * Legend GEREKLİ — `TrendChart`'ın aksine burada birden çok
         * seri var ve hangi çizginin TYT hangisinin branş olduğu
         * renkten başka bir şeyle anlaşılamaz.
         */}
        <ul className="flex flex-wrap items-center gap-3">
          {ciziler.map((c) => (
            <li
              key={c.tur}
              className="flex items-center gap-1.5 text-[length:var(--text-xs)] text-[var(--color-ink-2)]"
            >
              <span
                aria-hidden
                className="h-0.5 w-4 rounded-full"
                style={{ background: c.renk }}
              />
              {c.ad}
            </li>
          ))}
        </ul>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mt-3 w-full"
        role="img"
        aria-label={ciziler
          .map((c) => `${c.ad}: son net ${formatNet(c.sonNet)}`)
          .join(". ")}
      >
        {/* Yatay ızgara — hairline. */}
        {ekseni.map((tick) => (
          <g key={tick.deger}>
            <line
              x1={PAD.left}
              x2={VIEW_W - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={tick.y}
              textAnchor="end"
              dominantBaseline="middle"
              className="tabular"
              fill="var(--color-ink-3)"
              fontSize={11}
            >
              {tick.deger}
            </text>
          </g>
        ))}

        {ciziler.map((c) => (
          <g key={c.tur}>
            <path
              d={c.path}
              fill="none"
              stroke={c.renk}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/*
             * Uç işareti yalnızca SON noktada. Her noktaya daire
             * koymak, sık denemede çizgiyi boncuk dizisine çevirirdi;
             * son nokta ise "şu an buradayım" der ve etiketi taşır.
             */}
            <circle cx={c.son.x} cy={c.son.y} r={4} fill={c.renk} />
            <text
              x={c.son.x}
              y={c.son.y - 10}
              textAnchor="end"
              className="tabular"
              fill="var(--color-ink-2)"
              fontSize={11}
            >
              {formatNet(c.sonNet)}
            </text>
          </g>
        ))}
      </svg>

      {/*
       * Tarih aralığı eksende değil altta: x ekseni etiketleri seri
       * başına farklı tarihlere düşerdi (her tür kendi takviminde
       * ilerliyor) ve üst üste binerdi.
       */}
      <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        {formatShortDate(geometry.ilkTarih)} –{" "}
        {formatShortDate(geometry.sonTarih)}
      </p>
    </section>
  );
}

/* ── Geometri ─────────────────────────────────────────────────── */

/**
 * Seri renkleri.
 *
 * Accent (turuncu) EN ÇOK veri olan seriye değil, TYT'ye sabitlendi:
 * marka rengi sabit bir anlam taşımalı, veri dağılımına göre yer
 * değiştirmemeli. Diğerleri mürekkep tonları — renk burada kategori
 * ayırıcı, vurgu değil.
 */
const RENKLER: Record<string, string> = {
  tyt: "var(--color-accent)",
  ayt: "var(--color-ink-2)",
  brans: "var(--color-ink-3)",
  ydt: "var(--color-line-3)",
};

interface CiziliSeri {
  tur: string;
  ad: string;
  renk: string;
  path: string;
  son: { x: number; y: number };
  sonNet: number;
}

function hesaplaGeometri(seriler: CizilebilirSeri[]) {
  if (seriler.length === 0) return null;

  const tumNoktalar = seriler.flatMap((s) => s.noktalar);
  if (tumNoktalar.length === 0) return null;

  const netler = tumNoktalar.map((n) => n.net);
  /*
   * Eksen SIFIRI İÇERİR (`Math.min(0, ...)`). Yalnızca veri aralığına
   * oturtulsaydı 85 ile 88 arası gezinen bir seri, ekranı baştan
   * aşağı kat eden dramatik bir yükseliş gibi görünürdü — üç netlik
   * bir fark için yanıltıcı bir grafik.
   */
  const enAz = Math.min(0, ...netler);
  const enCok = Math.max(...netler);
  // Tepe ile taban aynıysa (hepsi 0 net) sıfıra bölme olurdu.
  const aralik = enCok - enAz || 1;

  const plotW = VIEW_W - PAD.left - PAD.right;
  const plotH = VIEW_H - PAD.top - PAD.bottom;

  const y = (net: number) => PAD.top + (1 - (net - enAz) / aralik) * plotH;

  const ciziler: CiziliSeri[] = seriler.map((s) => {
    const coords = s.noktalar.map((n, i) => ({
      x:
        s.noktalar.length === 1
          ? PAD.left + plotW / 2
          : PAD.left + (i / (s.noktalar.length - 1)) * plotW,
      y: y(n.net),
    }));

    return {
      tur: s.tur,
      ad: s.ad,
      renk: RENKLER[s.tur] ?? "var(--color-ink-3)",
      path: coords
        .map(
          (c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`,
        )
        .join(" "),
      son: coords[coords.length - 1],
      sonNet: s.noktalar[s.noktalar.length - 1].net,
    };
  });

  const ekseni = [enAz, (enAz + enCok) / 2, enCok].map((deger) => ({
    deger: Math.round(deger),
    y: y(deger),
  }));

  const tarihler = tumNoktalar.map((n: NetNoktasi) => n.tarih).sort();

  return {
    ciziler,
    ekseni,
    ilkTarih: tarihler[0],
    sonTarih: tarihler[tarihler.length - 1],
  };
}
