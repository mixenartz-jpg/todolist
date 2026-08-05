"use client";

import { memo } from "react";
import type { CellState } from "@/features/entries/completion";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";

interface MatrixCellProps {
  routineId: string;
  date: string;
  state: CellState;
  value: number;
  target: number;
  colorSlot: number;
  isToday: boolean;
  isWeekStart: boolean;
  isWeekend: boolean;
  isFocused: boolean;
  label: string;
}

/**
 * Tek hücre.
 *
 * Hiçbir hesaplama yapmaz: `state` üst bileşende ayın tamamı için bir
 * kez hesaplanır. Tıklama işleyicisi de prop değildir — ızgara
 * üzerinde tek bir delege dinleyici `data-*` özniteliklerini okur.
 * Bu ikisi sayesinde `memo` karşılaştırması tamamen primitif kalır ve
 * hücreler gereksiz yere yeniden render edilmez.
 */
export const MatrixCell = memo(function MatrixCell({
  routineId,
  date,
  state,
  value,
  target,
  colorSlot,
  isToday,
  isWeekStart,
  isWeekend,
  isFocused,
  label,
}: MatrixCellProps) {
  const isInactive = state === "inactive";
  const ratio = target > 0 ? Math.min(value / target, 1) : 0;

  return (
    <button
      type="button"
      role="gridcell"
      data-routine-id={routineId}
      data-date={date}
      data-cell="1"
      disabled={isInactive}
      tabIndex={isFocused ? 0 : -1}
      aria-label={label}
      // gridcell aria-pressed'i desteklemez; durum aria-label içinde
      // zaten okunuyor ("… 5/8 bardak").
      aria-selected={isFocused}
      className={cn(
        "cell",
        state === "done" && "cellDone",
        isToday && "todayColumn",
        isWeekStart && "weekStart",
        isWeekend && !isToday && "weekend",
        !isInactive && "hover:bg-[var(--color-surface-2)]",
      )}
    >
      {!isInactive && (
        <Mark state={state} ratio={ratio} colorSlot={colorSlot} />
      )}
    </button>
  );
});

function Mark({
  state,
  ratio,
  colorSlot,
}: {
  state: CellState;
  ratio: number;
  colorSlot: number;
}) {
  const color = slotVar(colorSlot);

  if (state === "done") {
    return (
      <span className="cellMark" style={{ background: color }}>
        <CheckGlyph />
      </span>
    );
  }

  if (state === "partial") {
    // Kısmi ilerleme: alttan dolan kutu, onay işareti YOK — hedef
    // tutmadığı için görsel olarak da "tamamlanmadı" demeli.
    // Dolgu soluk tutulur ki dolu hücreyle karışmasın.
    return (
      <span
        className="cellMark cellMarkPartial"
        style={{
          border: `1px solid color-mix(in oklch, ${color} 60%, transparent)`,
        }}
      >
        <span
          className="cellFill"
          style={{
            height: `${Math.round(ratio * 100)}%`,
            background: color,
          }}
        />
      </span>
    );
  }

  if (state === "missed") {
    // Kaçırılmış: içi boş, soluk çerçeve. Kırmızı DEĞİL — her kaçırılan
    // günü alarm gibi göstermek günlük kullanımı cezalandırıcı yapar.
    return (
      <span
        className="cellMark"
        style={{ border: "1px solid var(--color-line-2)" }}
      />
    );
  }

  if (state === "empty") {
    // Yalnızca BUGÜN: yapılmayı bekleyen iş. Kesikli çerçeve dikkat çeker.
    return (
      <span
        className="cellMark"
        style={{ border: `1.5px dashed color-mix(in oklch, ${color} 55%, transparent)` }}
      />
    );
  }

  if (state === "future") {
    // Gelecekte zorunlu ama sırası gelmedi: sessiz nokta.
    // Ayın kalanını kesikli kutularla doldurmak gürültü yaratırdı.
    return (
      <span
        className="size-1.5 rounded-full"
        style={{ background: `color-mix(in oklch, ${color} 30%, transparent)` }}
      />
    );
  }

  // not-due: zorunlu değil. Neredeyse görünmez bir nokta.
  return (
    <span
      className="size-1 rounded-full"
      style={{ background: "var(--color-line-2)" }}
    />
  );
}

function CheckGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 6.2l2.4 2.4L9.5 4"
        stroke="white"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
