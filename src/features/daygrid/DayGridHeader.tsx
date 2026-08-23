"use client";

import { Button } from "@/components/Button";
import { cn } from "@/lib/ui/cn";
import { formatWeekRange } from "@/lib/ui/tr";
import type { DateStr } from "@/lib/date/types";
import type { GridScale } from "./useDayGridSurface";

interface DayGridHeaderProps {
  scale: GridScale;
  isCurrent: boolean;
  onScale: (next: GridScale) => void;
  onStep: (delta: -1 | 1) => void;
  onToday: () => void;
}

/**
 * Izgaranın gezinme kontrolleri: ölçek anahtarı + ◀ ▶ + Bugün.
 *
 * `ScreenHeader`'ın `actions` ve `children` yuvalarına dağıtılır, kendi
 * başlık şeridini kurmaz — Bugün ekranında zaten bir başlık var ve iki
 * yapışkan şerit mobilde ekranın üçte birini yerdi. Ayrıca `--header-h`
 * tek bir şeridi ölçebiliyor; ikincisi altındaki yapışkan elemanları
 * yanlış yere tutturtururdu.
 */
export function DayGridHeader({
  scale,
  isCurrent,
  onScale,
  onStep,
  onToday,
}: DayGridHeaderProps) {
  return (
    <div className="flex items-center gap-1">
      {/* "Bugün" yalnızca başka bir aralıktayken görünür —
          `WeekSwitcher`'ın kuralı: hiçbir şey yapmayan düğme sunulmaz. */}
      {!isCurrent && (
        <Button size="sm" variant="ghost" onClick={onToday}>
          Bugün
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        aria-label={scale === "day" ? "Önceki gün" : "Önceki günler"}
        onClick={() => onStep(-1)}
        className="px-2"
      >
        <NavChevron direction="left" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label={scale === "day" ? "Sonraki gün" : "Sonraki günler"}
        onClick={() => onStep(1)}
        className="px-2"
      >
        <NavChevron direction="right" />
      </Button>

      <ScaleSwitch scale={scale} onScale={onScale} />
    </div>
  );
}

/**
 * Gün / Hafta anahtarı.
 *
 * `role="group"` + `aria-pressed` iki düğme — `DayPicker` ve
 * `TimeEditor`'daki desen. Yeni bir Tabs bileşeni açmaya değmez:
 * seçenek iki tane ve ikisi de aynı sayfada kalıyor, gerçek bir
 * gezinme yok.
 */
function ScaleSwitch({
  scale,
  onScale,
}: {
  scale: GridScale;
  onScale: (next: GridScale) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Görünüm ölçeği"
      className="ml-1 flex rounded-lg bg-[var(--color-surface-2)] p-0.5"
    >
      <ScaleButton
        label="Gün"
        active={scale === "day"}
        onClick={() => onScale("day")}
      />
      <ScaleButton
        label="Hafta"
        active={scale === "week"}
        onClick={() => onScale("week")}
      />
    </div>
  );
}

function ScaleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[length:var(--text-xs)]",
        "transition-colors duration-[var(--duration-fast)]",
        active
          ? "bg-[var(--color-surface)] font-medium text-[var(--color-ink)]"
          : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
      )}
    >
      {label}
    </button>
  );
}

/**
 * Sayfa çeviren ok.
 *
 * `components/Chevron` DEĞİL: o bir şeyi AÇAR (kapalıyken sağa, açıkken
 * aşağı) ve kendi dosyasında bu ayrımı açıkça yazıyor. Sayfa çeviren
 * oklar `WeekSwitcher`, `MonthSwitcher` ve `PlanlamaHeader`'da da yerel
 * olarak çiziliyor; buradaki çizim onlarla birebir aynı.
 */
function NavChevron({ direction }: { direction: "left" | "right" }) {
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

/** Başlık metni: gün ölçeğinde tek tarih, hafta ölçeğinde aralık. */
export function gridRangeLabel(
  scale: GridScale,
  dates: readonly DateStr[],
  formatDay: (d: DateStr) => string,
): string {
  if (scale === "day" || dates.length < 2) return formatDay(dates[0]);
  return formatWeekRange(dates[0], dates[dates.length - 1]);
}
