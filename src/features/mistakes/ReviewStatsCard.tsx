"use client";

import { useMemo } from "react";
import { cn } from "@/lib/ui/cn";
import { formatPercent } from "@/lib/ui/tr";
import type { DateStr } from "@/lib/date/types";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { EMPTY_MISTAKES, useMistakes } from "./queries";
import { GRADUATED_STAGE } from "./review";
import { reviewStats } from "./stats";

/**
 * Yanlışlar çetelesi kartı — "kaçını bitirdim".
 *
 * ── Neden var? ──
 * Uygulama bugüne kadar yalnızca vadesi gelen tekrarları gösteriyordu:
 * yapılacak iş. Biriken BAŞARI (mezun olmuş yanlışlar) hiçbir yerde
 * görünmüyordu, oysa sınav çalışmasında motive eden sayı odur.
 *
 * ── Neden yüzde DEĞİL de "31/47" önde? ──
 * Ham sayı somut ve doğrulanabilir; yüzde ondan türetilir ve tek
 * başına ne kadar iş yapıldığını gizler (%66 üç yanlıştan ikisi de
 * olabilir, elli yanlıştan otuz üçü de). Yüzde yanında, ikincil.
 *
 * Hiç yanlış yoksa kart HİÇ çizilmez — `ReviewQueue`'nun boşken hiçbir
 * şey render etmeme kararıyla aynı: defteri hiç kullanmamış birine boş
 * bir çetele göstermek, ekranı doldurmaktan başka işe yaramaz.
 */
export function ReviewStatsCard({
  today,
  onError,
  heading = true,
}: {
  today: DateStr;
  onError?: (message: string) => void;
  /**
   * Kendi bölüm başlığını çizsin mi?
   *
   * Başlık kartın İÇİNDE duruyor çünkü kart hiç yanlış yokken kendini
   * çizmiyor; başlığı çağırana bıraksaydık altı boş bir başlık
   * kalırdı. Yanlışlar ekranı `false` verir — orada zaten sayfanın
   * kendi başlığı var.
   */
  heading?: boolean;
}) {
  const { data } = useMistakes();
  const mistakes = data ?? EMPTY_MISTAKES;

  const stats = useMemo(() => reviewStats(mistakes, today), [mistakes, today]);

  if (stats.total === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      {heading && (
        <SectionHeading sectionKey="today.reviewStats" onError={onError} />
      )}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[length:var(--text-2xl)] font-semibold leading-none tracking-[-0.02em]">
          {stats.graduated}
        </span>
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          / {stats.total} mezun
        </span>
        {stats.graduationRate !== null && (
          <span className="tabular ml-auto text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {formatPercent(stats.graduationRate)}
          </span>
        )}
      </div>

      <StageBar byStage={stats.byStage} total={stats.total} />

      <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        {stats.inProgress > 0
          ? `${stats.inProgress} yanlış hâlâ tekrarda.`
          : "Hepsi mezun oldu."}
      </p>
    </section>
  );
}

/**
 * Aşama dağılımı — tek satırlık yığılmış çubuk.
 *
 * Ayrı bir grafik kütüphanesi DEĞİL: beş kovalı tek bir oran çubuğu,
 * `TrendChart`'ın yanına ikinci bir çizim katmanı getirmeyi hak
 * etmiyor. Renk tek başına bilgi taşımaz — sayılar `title` ve
 * `aria-label` ile okunabilir durumda.
 */
function StageBar({
  byStage,
  total,
}: {
  byStage: readonly number[];
  total: number;
}) {
  return (
    <div
      className="flex h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
      role="img"
      aria-label={byStage
        .map((count, stage) =>
          stage === GRADUATED_STAGE
            ? `mezun: ${count}`
            : `${stage}. tekrar: ${count}`,
        )
        .join(", ")}
    >
      {byStage.map((count, stage) =>
        count === 0 ? null : (
          <div
            key={stage}
            title={
              stage === GRADUATED_STAGE
                ? `Mezun: ${count}`
                : `${stage} tekrar yapılmış: ${count}`
            }
            style={{ width: `${(count / total) * 100}%` }}
            className={cn(
              "h-full",
              // Mezun kovası VURGULU, ötekiler nötr: göz önce
              // "ne kadarı bitti" sorusunun cevabını bulmalı.
              stage === GRADUATED_STAGE
                ? "bg-[var(--color-good)]"
                : "bg-[var(--color-line-3)]",
            )}
          />
        ),
      )}
    </div>
  );
}
