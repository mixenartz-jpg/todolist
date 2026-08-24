"use client";

import { useMemo } from "react";
import type { DateStr } from "@/lib/date/types";
import { formatTime } from "@/features/tasks/schedule";
import type { Task } from "@/features/tasks/types";
import type { OpenTaskHandler } from "./drop";
import { packLanes } from "./lanes";
import { snapMinutes, type GridMetrics } from "./geometry";
import { hourMarks } from "./range";
import { TaskBlock } from "./TaskBlock";

interface DayColumnProps {
  date: DateStr;
  tasks: readonly Task[];
  metrics: GridMetrics;
  /** Görev kimliği → kategori renk slotu. */
  colorOf: (task: Task) => number | null;
  onOpen: OpenTaskHandler;
  /** Boş bir yuvaya tıklandı — o saatte görev eklenecek. */
  onEmptyClick: (date: DateStr, startMinute: number) => void;
  onMoveStart: (task: Task, e: React.PointerEvent<HTMLElement>) => void;
  onResizeStart: (task: Task, e: React.PointerEvent<HTMLElement>) => void;
  didDrag: () => boolean;
  /** Şu an sürüklenen görevin kimliği — asıl konumu soluklaşır. */
  draggingId: string | null;
}

/**
 * Tek bir günün sütunu: boş yuva hedefleri + görev blokları.
 *
 * Boş yuvalar saatte BİR düğmedir, 15 dakikada bir değil. Dört kat
 * daha fazla DOM elemanı, dört kat daha uzun sekme sırası demek
 * olurdu; tıklamanın düştüğü dakika zaten yuvanın neresine
 * basıldığından hesaplanıp 15'e yuvarlanıyor.
 */
export function DayColumn({
  date,
  tasks,
  metrics,
  colorOf,
  onOpen,
  onEmptyClick,
  onMoveStart,
  onResizeStart,
  didDrag,
  draggingId,
}: DayColumnProps) {
  const items = useMemo(() => packLanes(tasks), [tasks]);
  const marks = useMemo(
    () => hourMarks({ startMinute: metrics.startMinute, endMinute: metrics.endMinute }),
    [metrics.startMinute, metrics.endMinute],
  );

  return (
    <div className="dgColumn" role="group" aria-label={date}>
      {marks.map((minute) => (
        <button
          key={minute}
          type="button"
          aria-label={`${formatTime(minute)} için görev ekle`}
          onClick={(e) => {
            // Tıklamanın yuva İÇİNDEKİ dikey konumu dakikaya çevrilir:
            // saatin alt yarısına basmak 30'u seçer, tepesine basmak 00.
            const rect = e.currentTarget.getBoundingClientRect();
            const offset = ((e.clientY - rect.top) / rect.height) * 60;
            onEmptyClick(date, snapMinutes(minute + offset));
          }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${((minute - metrics.startMinute) / 60) * metrics.hourHeight}px`,
            height: `${metrics.hourHeight}px`,
          }}
          className="transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-2)]"
        />
      ))}

      {items.map((item) => (
        <TaskBlock
          key={item.task.id}
          item={item}
          metrics={metrics}
          colorSlot={colorOf(item.task)}
          onOpen={onOpen}
          onMoveStart={onMoveStart}
          onResizeStart={onResizeStart}
          didDrag={didDrag}
          dragging={draggingId === item.task.id}
        />
      ))}
    </div>
  );
}
