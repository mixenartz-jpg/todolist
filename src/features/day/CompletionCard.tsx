import { Card } from "@/components/Card";
import { completionTone, TONE_COLOR } from "@/features/results/format";

/**
 * Üst kart: tarih + "Görev tamamlama" yüzdesi + çubuk. Renk yüzdeye
 * göre (düşük kırmızı, orta sarı, yüksek yeşil) — eşikler
 * `completionTone`'da.
 */
export function CompletionCard({
  title,
  done,
  total,
  subtitle,
}: {
  title: string;
  done: number;
  total: number;
  subtitle?: string;
}) {
  const ratio = total === 0 ? 0 : done / total;
  const percent = Math.round(ratio * 100);
  const color = total === 0 ? "var(--color-ink-3)" : TONE_COLOR[completionTone(ratio)];

  return (
    <Card as="section" aria-label="Günün özeti">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">{subtitle}</p>
          )}
        </div>
        <span
          className="shrink-0 text-[length:var(--text-xl)] font-semibold tabular-nums"
          style={{ color }}
        >
          {total === 0 ? "—" : `${percent}%`}
        </span>
      </div>

      <p className="mt-3 text-[length:var(--text-2xs)] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-3)]">
        Görev tamamlama · {done}/{total}
      </p>
      <div
        className="mt-2 h-1.5 w-full max-w-64 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Görev tamamlama"
      >
        <div
          className="h-full rounded-full transition-[width] duration-[var(--duration-base,240ms)]"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </Card>
  );
}
