import { formatShortDate } from "@/lib/ui/tr";
import { cn } from "@/lib/ui/cn";
import { resultSummary } from "./format";
import { STATUS_LABELS, type TaskResult, type TaskResultStatus } from "./types";

/*
 * Öğrenci sonucunun SALT OKUNUR gösterimi — koçun Planlama kartı ve
 * Gün görünümü aynı bileşeni kullanır.
 */

const ICON: Record<TaskResultStatus, { glyph: string; color: string }> = {
  done: { glyph: "✓", color: "var(--color-good)" },
  partial: { glyph: "◐", color: "var(--color-warn)" },
  skipped: { glyph: "✕", color: "var(--color-danger)" },
};

export function ResultIcon({ status }: { status: TaskResultStatus | null }) {
  if (!status) return <span aria-hidden className="text-[var(--color-ink-3)]">•</span>;
  const { glyph, color } = ICON[status];
  return (
    <span aria-label={STATUS_LABELS[status]} style={{ color }} className="font-semibold">
      {glyph}
    </span>
  );
}

const UNDERSTANDING = ["Anlamadı", "Kısmen anladı", "Anladı"];

export function ResultDetail({
  result: r,
  showDate,
  progress,
}: {
  result: TaskResult;
  showDate: boolean;
  /** İlerlet satırı: "Hedef ~10 sayfa → 8 sayfa ilerledi (126-133)". */
  progress?: string | null;
}) {
  const summary = resultSummary(r);
  return (
    <dl className={cn("grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5", "[&+&]:mt-2 [&+&]:border-t [&+&]:border-[var(--color-line)] [&+&]:pt-2")}>
      {showDate && (
        <>
          <dt className="text-[var(--color-ink-3)]">Gün</dt>
          <dd>{formatShortDate(r.date)}</dd>
        </>
      )}
      {r.status && (
        <>
          <dt className="text-[var(--color-ink-3)]">Durum</dt>
          <dd>{STATUS_LABELS[r.status]}</dd>
        </>
      )}
      {progress && (
        <>
          <dt className="text-[var(--color-ink-3)]">İlerleme</dt>
          <dd>{progress}</dd>
        </>
      )}
      {r.understanding != null && (
        <>
          <dt className="text-[var(--color-ink-3)]">Anlama</dt>
          <dd>{UNDERSTANDING[r.understanding - 1]}</dd>
        </>
      )}
      {r.feynmanNote && (
        <>
          <dt className="text-[var(--color-ink-3)]">Feynman</dt>
          <dd className="whitespace-pre-wrap">{r.feynmanNote}</dd>
        </>
      )}
      {summary && (
        <>
          <dt className="text-[var(--color-ink-3)]">Sonuç</dt>
          <dd>{summary}</dd>
        </>
      )}
      {r.reason && (
        <>
          <dt className="text-[var(--color-ink-3)]">Sebep</dt>
          <dd>{r.reason}</dd>
        </>
      )}
      {r.missingTopics.length > 0 && (
        <>
          <dt className="text-[var(--color-ink-3)]">Eksik</dt>
          <dd>{r.missingTopics.join(", ")}</dd>
        </>
      )}
      {r.note && (
        <>
          <dt className="text-[var(--color-ink-3)]">Not</dt>
          <dd className="whitespace-pre-wrap">{r.note}</dd>
        </>
      )}
    </dl>
  );
}
