"use client";

import { memo } from "react";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import { WEEKDAYS_LONG } from "@/lib/ui/tr";
import { isoWeekday } from "@/lib/date/date";
import { formatDuration, formatTime } from "@/features/tasks/schedule";
import type { Task } from "@/features/tasks/types";
import { isPendingTask } from "./drop";
import { minuteToY, type GridMetrics } from "./geometry";
import { laneGeometry, type LaneItem } from "./lanes";

interface TaskBlockProps {
  item: LaneItem;
  metrics: GridMetrics;
  /** Kategori rengi; yoksa nötr yüzey kullanılır. */
  colorSlot: number | null;
  onOpen: (task: Task) => void;
  onMoveStart: (task: Task, e: React.PointerEvent<HTMLElement>) => void;
  onResizeStart: (task: Task, e: React.PointerEvent<HTMLElement>) => void;
  /** Sürükleme gerçekleşti mi? Tıklamayı yutmak için sorulur. */
  didDrag: () => boolean;
  /** Bu blok şu an sürükleniyor — asıl konumu soluklaşır. */
  dragging: boolean;
}

/**
 * Izgaradaki tek görev bloğu.
 *
 * Konum ve yükseklik dakikadan hesaplanıp inline `style` ile verilir —
 * bunu CSS'te ifade etmenin yolu yok. Renk, kenarlık ve durum stilleri
 * ise sınıflarda kalır.
 *
 * ── Neden `TaskItem` değil? ──
 * `TaskItem` kutucuk + başlık + üç eylem simgesinden oluşan bir LİSTE
 * satırıdır ve en dar halinde bile ~64px yüksekliğe ihtiyaç duyar.
 * Izgarada 15 dakikalık bir blok 13px'tir; oraya bir liste satırı
 * sığmaz. Blok tıklanınca `TaskItem`'ın kendisi açılır (bkz.
 * DayColumn) — yani düzenleme yolu tek, gösterim iki biçimli.
 */
export const TaskBlock = memo(function TaskBlock({
  item,
  metrics,
  colorSlot,
  onOpen,
  onMoveStart,
  onResizeStart,
  didDrag,
  dragging,
}: TaskBlockProps) {
  const { task, startMinute, endMinute } = item;
  const { leftPct, widthPct } = laneGeometry(item);

  const top = minuteToY(startMinute, metrics);
  const height = minuteToY(endMinute, metrics) - top;

  const pending = isPendingTask(task.id);
  const accent = colorSlot === null ? "var(--color-ink-3)" : slotVar(colorSlot);

  /*
   * Ekran okuyucu bloğun görsel konumunu göremez: saat, süre ve gün
   * etikete AÇIKÇA yazılır. Hafta görünümünde sütun başlığı görsel bir
   * ipucudur ve tek başına okunmaz.
   */
  const timeLabel = task.durationMinutes
    ? `${formatTime(startMinute)}–${formatTime(endMinute)}`
    : formatTime(startMinute);
  const dayLabel = task.dueDate ? WEEKDAYS_LONG[isoWeekday(task.dueDate)] : "";

  return (
    <div
      style={{
        position: "absolute",
        top: `${top}px`,
        height: `${height}px`,
        left: `calc(${leftPct}% + var(--daygrid-block-gap))`,
        width: `calc(${widthPct}% - var(--daygrid-block-gap) * 2)`,
      }}
      className={cn(dragging && "opacity-40")}
    >
      <button
        type="button"
        disabled={pending}
        aria-busy={pending || undefined}
        aria-label={`${task.title}, ${timeLabel}${dayLabel ? `, ${dayLabel}` : ""}`}
        onPointerDown={(e) => {
          if (pending) return;
          onMoveStart(task, e);
        }}
        onClick={() => {
          // Sürükleme bittiğinde tarayıcı ayrıca bir `click` gönderir;
          // onu yutmazsak her bırakma düzenleme panelini de açardı.
          if (didDrag()) return;
          onOpen(task);
        }}
        style={{
          inset: 0,
          // Sol kenardaki renk şeridi kategoriyi taşır. Kenarlık olarak
          // değil `box-shadow` ile: kenarlık iç genişliği yerdi ve dar
          // şeritte başlığa yer kalmazdı.
          boxShadow: `inset 3px 0 0 0 ${accent}`,
        }}
        className={cn(
          "dgBlock",
          "border border-[var(--color-line-2)]",
          "transition-colors duration-[var(--duration-fast)]",
          pending
            ? "cursor-default opacity-60"
            : "cursor-grab hover:border-[var(--color-line-3)] hover:bg-[var(--color-surface-3)]",
          task.done
            ? "bg-[var(--color-surface-2)] text-[var(--color-ink-3)] line-through"
            : "bg-[var(--color-surface)] text-[var(--color-ink)]",
        )}
      >
        <span className="block truncate text-[length:var(--text-2xs)] leading-tight">
          {task.title}
        </span>

        {/*
          Saat yalnızca bloğun İÇİNE sığdığında yazılır. 15 dakikalık bir
          blokta ikinci satır başlığı iterek görünmez yapardı; saat zaten
          bloğun dikey konumundan okunuyor, başlık ise okunmuyor.
        */}
        {height >= 40 && (
          <span className="tabular block truncate text-[length:var(--text-2xs)] leading-tight text-[var(--color-ink-3)]">
            {formatTime(startMinute)}
            {task.durationMinutes ? ` · ${formatDuration(task.durationMinutes)}` : ""}
          </span>
        )}
      </button>

      {/*
        Boyutlandırma tutamağı yalnızca yeterince uzun bloklarda.
        15 dakikalık (≈13px) bir blokta 8px'lik tutamak alanın yarısını
        yutar ve bloğa basmak imkânsızlaşır.

        `aria-hidden`: klavye karşılığı ok tuşlarında (bkz. DayColumn
        kısayolları); görünmez bir tutamağı sekme sırasına sokmak
        ekran okuyucuya anlamsız bir durak eklerdi.
      */}
      {!pending && !task.done && height >= 30 && (
        <div
          aria-hidden
          className="dgResize"
          onPointerDown={(e) => {
            // Tutamak bloğun ÜSTÜNDE: taşıma başlatmasın.
            e.stopPropagation();
            onResizeStart(task, e);
          }}
        />
      )}
    </div>
  );
});
