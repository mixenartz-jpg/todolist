"use client";
import { ScreenHeader } from "@/components/Screen";

import type { ReactNode } from "react";
import { addDays, endOfMonth, startOfIsoWeek, startOfMonth, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { Button } from "@/components/Button";
import { formatMonthYear, formatWeekRange } from "@/lib/ui/tr";
import type { PlanScale } from "./range";

interface PlanlamaHeaderProps {
  scale: PlanScale;
  anchor: DateStr;
  today: DateStr;
  openTotal: number;
  onAnchorChange: (next: DateStr) => void;
  /** Başlığın altına giren ek içerik — kategori filtre çubuğu gibi. */
  children?: ReactNode;
}

/**
 * Ay ve Hafta ekranlarının ortak başlığı.
 *
 * Ölçek düğmesi ARTIK YOK: ölçek bir rotadır ve `PlanlamaTabs`
 * gösterir. Burada kalan tek gezinme, aynı ölçek içinde ileri-geri
 * gitmektir.
 */
export function PlanlamaHeader({
  scale,
  anchor,
  today,
  openTotal,
  onAnchorChange,
  children,
}: PlanlamaHeaderProps) {
  const current = scale === "week" ? startOfIsoWeek(today) : startOfMonth(today);
  const isCurrent = anchor === current;

  const { year, month } = toParts(anchor);
  const title =
    scale === "week"
      ? formatWeekRange(anchor, addDays(anchor, 6))
      : formatMonthYear(year, month);

  return (
    <ScreenHeader
      title={title}
      width="6xl"
      subtitle={
        openTotal > 0 ? (
          <>
            <span className="tabular">{openTotal}</span> açık iş
          </>
        ) : undefined
      }
      actions={
        <>
          {/* Yalnızca başka bir aralıktayken görünür: bulunduğun yere
              götüren bir düğme hiçbir şey yapmaz. */}
          {!isCurrent && (
            <Button size="sm" variant="ghost" onClick={() => onAnchorChange(current)}>
              {scale === "week" ? "Bu hafta" : "Bu ay"}
            </Button>
          )}

          <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label={scale === "week" ? "Önceki hafta" : "Önceki ay"}
            onClick={() => onAnchorChange(shiftAnchor(anchor, scale, -1))}
            className="px-2"
          >
            <Chevron direction="left" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={scale === "week" ? "Sonraki hafta" : "Sonraki ay"}
            onClick={() => onAnchorChange(shiftAnchor(anchor, scale, 1))}
            className="px-2"
          >
            <Chevron direction="right" />
          </Button>
          </div>
        </>
      }
    >
      {children}
    </ScreenHeader>
  );
}

/** Çapayı bir ölçek ileri/geri taşır. */
export function shiftAnchor(
  anchor: DateStr,
  scale: PlanScale,
  direction: -1 | 1,
): DateStr {
  if (scale === "week") return addDays(anchor, direction * 7);

  // Aya bir ay eklemek: ayın sonundan taşmamak için ayın 1'inden
  // hesaplanır ve sonuç yine ayın 1'ine oturur.
  const start = startOfMonth(anchor);
  return startOfMonth(
    direction === 1 ? addDays(endOfMonth(start), 1) : addDays(start, -1),
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={direction === "left" ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
