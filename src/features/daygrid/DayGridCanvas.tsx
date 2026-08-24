"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { cn } from "@/lib/ui/cn";
import { isoWeekday, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { WEEKDAYS_SHORT } from "@/lib/ui/tr";
import { endMinutes, formatDuration, formatTime } from "@/features/tasks/schedule";
import type { Task } from "@/features/tasks/types";
import { DayColumn } from "./DayColumn";
import type { DragResult, OpenTaskHandler } from "./drop";
import { canvasHeight, DEFAULT_DURATION, minuteToY, type GridMetrics } from "./geometry";
import { hourMarks, visibleWindow } from "./range";
import { useDragBlock, type DragState } from "./useDragBlock";
import { useGridMetrics } from "./useGridMetrics";
import { useNowMinute } from "./useNowMinute";
import "./daygrid.css";

interface DayGridCanvasProps {
  dates: readonly DateStr[];
  today: DateStr;
  /** Gün → o güne tarihli görevler. */
  tasksByDate: ReadonlyMap<DateStr, Task[]>;
  colorOf: (task: Task) => number | null;
  onOpen: OpenTaskHandler;
  onEmptyClick: (date: DateStr, startMinute: number) => void;
  /** true → pencere 00:00–24:00. */
  expanded: boolean;
  /** Saatsiz şerit — "ızgaradan çıkar" bırakma hedefi. */
  untimedRef: RefObject<HTMLElement | null>;
  onCommit: (result: DragResult) => void;
  /**
   * Sürükleme başlatıcıları dışarı verilir: saatsiz şeritteki çipler de
   * aynı motoru kullanıyor ama tuvalin dışında yaşıyorlar.
   *
   * Hook burada kalıyor çünkü `GridMetrics` (saat penceresi + satır
   * yüksekliği) burada hesaplanıyor ve motorun ona ihtiyacı var;
   * yukarı taşımak metriği yukarı bildirmeyi, o da bir render
   * döngüsünü getirirdi.
   */
  onDragReady: (api: {
    startMove: (task: Task, e: React.PointerEvent<HTMLElement>) => void;
    didDrag: () => boolean;
  }) => void;
}

/**
 * Izgaranın tuvali: saat oluğu, gün sütunları ve şimdi çizgisi.
 *
 * Sütun başlıkları burada DEĞİL — onlar kaydırma alanının dışında,
 * `DayGridScreen`'de durur; tuval kaydırıldığında başlıkların yerinde
 * kalması gerekir.
 */
export function DayGridCanvas({
  dates,
  today,
  tasksByDate,
  colorOf,
  onOpen,
  onEmptyClick,
  expanded,
  untimedRef,
  onCommit,
  onDragReady,
}: DayGridCanvasProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const showsToday = dates.includes(today);
  const nowMinute = useNowMinute(showsToday);

  /*
   * Pencere GÖRÜNEN TÜM günlerin görevlerine göre hesaplanır, gün gün
   * değil: hafta görünümünde her sütun kendi penceresini kullansaydı
   * sütunlar farklı saatlerden başlar ve yatay hizalama tamamen
   * bozulurdu — ızgara okunmaz olurdu.
   */
  const window = useMemo(() => {
    const all = [...tasksByDate.values()].flat();
    return visibleWindow(all, { now: nowMinute, expanded });
  }, [tasksByDate, nowMinute, expanded]);

  const metrics = useGridMetrics(frameRef, window);
  const marks = useMemo(() => hourMarks(window), [window]);

  const { drag, startMove, startResize, didDrag } = useDragBlock({
    metrics,
    dates,
    canvasRef,
    untimedRef,
    onCommit,
  });

  /* Başlatıcılar yukarı verilir; şerit çipleri de onları kullanıyor.
     `startMove`/`didDrag` `useCallback` ile kararlı, döngü olmaz. */
  useEffect(() => {
    onDragReady({ startMove, didDrag });
  }, [onDragReady, startMove, didDrag]);

  return (
    <div
      ref={frameRef}
      className="dgFrame"
      style={{ ["--dg-cols" as string]: String(dates.length) }}
    >
      <div className="dgGutter" style={{ height: `${canvasHeight(metrics)}px` }}>
        {marks.map((minute) => (
          <span
            key={minute}
            className="dgHourLabel"
            style={{ top: `${minuteToY(minute, metrics)}px` }}
          >
            {formatTime(minute)}
          </span>
        ))}
      </div>

      <div
        ref={canvasRef}
        className="dgCanvas"
        role="grid"
        aria-label={`Zaman çizelgesi, ${formatTime(window.startMinute)}–${formatTime(window.endMinute)}`}
        style={{ height: `${canvasHeight(metrics)}px` }}
      >
        <div className="dgLines" aria-hidden />

        {dates.map((date) => (
          <DayColumn
            key={date}
            date={date}
            tasks={tasksByDate.get(date) ?? EMPTY}
            metrics={metrics}
            colorOf={colorOf}
            onOpen={onOpen}
            onEmptyClick={onEmptyClick}
            onMoveStart={startMove}
            onResizeStart={startResize}
            didDrag={didDrag}
            draggingId={drag?.taskId ?? null}
          />
        ))}

        {/* Sürükleme hayaleti: bloğun gideceği yer. Saatsiz şeridin
            üzerindeyken çizilmez — orada hedef şeridin kendisi. */}
        {drag && !drag.overUntimed && (
          <DragGhost drag={drag} dates={dates} metrics={metrics} />
        )}

        {/* Şimdi çizgisi yalnızca bugün görünürken ve pencerenin
            içindeyken çizilir. Dekoratif: saat zaten başlıkta yazıyor. */}
        {nowMinute !== null &&
          nowMinute >= window.startMinute &&
          nowMinute <= window.endMinute && (
            <div
              className="dgNow"
              aria-hidden
              style={{ top: `${minuteToY(nowMinute, metrics)}px` }}
            />
          )}
      </div>

      {/*
        Sürükleme sırasında konumu duyurur.

        `polite`, `assertive` DEĞİL: sürükleme boyunca her 15 dakikada
        bir kesmek yorucu olurdu. Ekran okuyucu kullanıcısı zaten ok
        tuşlarıyla taşıyor (bkz. DayColumn kısayolları) ve orada da
        aynı bölge okunur.
      */}
      <div aria-live="polite" className="sr-only">
        {drag
          ? drag.overUntimed
            ? "Saatsiz"
            : `${formatTime(drag.previewStart)}${
                drag.previewDuration ? `, ${formatDuration(drag.previewDuration)}` : ""
              }`
          : ""}
      </div>
    </div>
  );
}

const EMPTY: Task[] = [];

/**
 * Sürükleme önizlemesi.
 *
 * Asıl blok yerinde soluk kalır, hayalet gideceği yeri gösterir. Bloğu
 * doğrudan taşımak daha "gerçek" görünürdü ama nereden geldiğini
 * kaybettirir; iki konumu birden görmek geri dönmeyi kolaylaştırır.
 *
 * `aria-hidden`: konum bilgisi zaten `aria-live` bölgesinde
 * duyuruluyor, hayalet yalnızca görsel.
 */
function DragGhost({
  drag,
  dates,
  metrics,
}: {
  drag: DragState;
  dates: readonly DateStr[];
  metrics: GridMetrics;
}) {
  const column = Math.max(0, dates.indexOf(drag.previewDate));
  const width = 100 / dates.length;

  /*
   * Süresiz görevin hayaleti GÖRÜNÜR bir yükseklikle çizilir, ama bu
   * yalnızca çizim: `previewDuration` null kalır ve bırakıldığında
   * göreve süre yazılmaz (bkz. useDragBlock/armDrag). Sıfır yükseklikli
   * bir hayalet, sürüklenen şeyin nereye gittiğini göstermezdi.
   */
  const end = endMinutes(drag.previewStart, drag.previewDuration ?? DEFAULT_DURATION);

  return (
    <div
      aria-hidden
      className="dgGhost"
      style={{
        top: `${minuteToY(drag.previewStart, metrics)}px`,
        height: `${minuteToY(end, metrics) - minuteToY(drag.previewStart, metrics)}px`,
        left: `calc(${column * width}% + var(--daygrid-block-gap))`,
        width: `calc(${width}% - var(--daygrid-block-gap) * 2)`,
      }}
    />
  );
}

/** Sütun başlığı: gün kısaltması + gün sayısı. */
export function DayGridHeadings({
  dates,
  today,
}: {
  dates: readonly DateStr[];
  today: DateStr;
}) {
  // Tek günlük görünümde başlık gereksiz: tarih zaten ekran başlığında.
  if (dates.length < 2) return null;

  return (
    <div className="dgFrame">
      <div />
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))` }}
      >
        {dates.map((date) => {
          const isToday = date === today;
          return (
            <div key={date} className="px-1 py-1.5 text-center">
              <div className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                {WEEKDAYS_SHORT[isoWeekday(date)]}
              </div>
              <div
                className={cn(
                  "tabular mx-auto mt-0.5 grid size-6 place-items-center rounded-full text-[length:var(--text-sm)]",
                  isToday
                    ? "bg-[var(--color-accent)] font-medium text-[var(--color-bg)]"
                    : "text-[var(--color-ink-2)]",
                )}
              >
                {toParts(date).day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
