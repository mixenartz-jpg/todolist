"use client";

import { cn } from "@/lib/ui/cn";
import { STATUS_LABELS, type SourceKind, type SourceStatus } from "./types";
import type { UnitColor, UnitSummary } from "./unitStatus";

/*
 * Katalog parçaları: tür ikonu, durum rozeti, ilerleme çubuğu. Renkler
 * kutucuklarla aynı (yeşil çözüldü, sarı atandı, kırmızı havuza döndü).
 */

export const UNIT_COLOR: Record<UnitColor, string> = {
  green: "var(--color-good)",
  yellow: "var(--color-warn)",
  red: "var(--color-danger)",
  gray: "var(--color-surface-3)",
};

export const UNIT_COLOR_LABEL: Record<UnitColor, string> = {
  green: "çözüldü",
  yellow: "atandı",
  red: "havuza döndü",
  gray: "boş",
};

export function KindIcon({ kind, size = 16 }: { kind: SourceKind; size?: number }) {
  return kind === "video" ? (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-label="Video" role="img">
      <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 6v4l3.5-2-3.5-2z" fill="currentColor" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-label="Kitap" role="img">
      <path
        d="M2.5 3.2c1.8-.6 3.6-.5 5.5.6v9.4c-1.9-1.1-3.7-1.2-5.5-.6V3.2zM13.5 3.2c-1.8-.6-3.6-.5-5.5.6v9.4c1.9-1.1 3.7-1.2 5.5-.6V3.2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const STATUS_TONE: Record<SourceStatus, string> = {
  sirada: "border-[var(--color-line-2)] text-[var(--color-ink-3)]",
  devam: "border-[color-mix(in_oklch,var(--color-warn)_55%,transparent)] text-[var(--color-warn)]",
  bitti: "border-[color-mix(in_oklch,var(--color-good)_55%,transparent)] text-[var(--color-good)]",
};

export function StatusBadge({ status }: { status: SourceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[length:var(--text-2xs)] font-medium",
        STATUS_TONE[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Yığılmış ilerleme çubuğu: yeşil | sarı | kırmızı | gri. */
export function SummaryBar({ summary, className }: { summary: UnitSummary; className?: string }) {
  const pct = (n: number) => (summary.total ? (n / summary.total) * 100 : 0);
  return (
    <div
      className={cn("flex h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]", className)}
      role="img"
      aria-label={`${summary.green}/${summary.total} çözüldü, ${summary.yellow} atandı, ${summary.red} havuza döndü`}
    >
      {(["green", "yellow", "red"] as const).map((c) =>
        summary[c] > 0 ? <div key={c} style={{ width: `${pct(summary[c])}%`, background: UNIT_COLOR[c] }} /> : null,
      )}
    </div>
  );
}

export function percent(summary: UnitSummary): number {
  return summary.total ? Math.round((summary.green / summary.total) * 100) : 0;
}
