"use client";

import type { RefObject } from "react";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";
import { isPendingTask, type OpenTaskHandler } from "./drop";

interface UntimedStripProps {
  ref?: RefObject<HTMLDivElement | null>;
  dates: readonly DateStr[];
  /** Gün → o güne tarihli ama SAATSİZ görevler. */
  untimedByDate: ReadonlyMap<DateStr, Task[]>;
  colorOf: (task: Task) => number | null;
  onOpen: OpenTaskHandler;
  /** Şeritten ızgaraya sürükleme — çipler de blok gibi tutulabilir. */
  onMoveStart: (task: Task, e: React.PointerEvent<HTMLElement>) => void;
  didDrag: () => boolean;
}

/**
 * Izgaranın üstündeki "saatsiz" şeridi.
 *
 * Google Takvim'in "tüm gün" şeridinin karşılığı, ama anlamı farklı:
 * burada iş gün boyu sürmüyor, sadece SAATİ YOK. Saatsizlik birinci
 * sınıf bir durum (bkz. tasks/types.ts) ve o günün işi olmasına rağmen
 * ızgarada yeri olmayan görevlerin kaybolmaması gerekir.
 *
 * ── Tarihsiz görevler buraya GİRMEZ ──
 * "Bir ara yapılacak" işlerin (dueDate null) hiçbir güne ait olmaması
 * onların tanımı. Şeride konsalardı her günün üstünde aynı liste
 * tekrarlanır ve kullanıcı onları o güne söz verilmiş sanırdı. Onlar
 * ızgaranın altındaki kendi bölümlerinde kalır.
 *
 * Boşken hiç render edilmez: iki grup varken anlamlı olan "Saatsiz"
 * etiketi, tek grup varken gürültüdür (aynı gerekçe eski
 * `DaySchedule`'da da vardı).
 */
export function UntimedStrip({
  ref,
  dates,
  untimedByDate,
  colorOf,
  onOpen,
  onMoveStart,
  didDrag,
}: UntimedStripProps) {
  const total = dates.reduce(
    (sum, date) => sum + (untimedByDate.get(date)?.length ?? 0),
    0,
  );

  /*
   * Boşken görünmez ama SÖKÜLMEZ.
   *
   * Sürükleme bu şeridi bir bırakma hedefi olarak ölçüyor
   * (`getBoundingClientRect`) ve DOM'dan çıkmış bir elemanın ölçüsü
   * yoktur — ızgaradan çıkarma sessizce çalışmaz olurdu. Yükseklik
   * sıfıra iner, kenarlık kalkar; ekranda yer kaplamaz.
   */
  const empty = total === 0;

  return (
    <div
      ref={ref}
      className={cn("dgFrame", !empty && "border-b border-[var(--color-line)] pb-1.5")}
    >
      <div
        className={cn(
          "pr-2 pt-1 text-right text-[length:var(--text-2xs)] text-[var(--color-ink-3)]",
          empty && "hidden",
        )}
      >
        Saatsiz
      </div>

      <div
        className="grid gap-[var(--daygrid-block-gap)]"
        style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))` }}
      >
        {dates.map((date) => (
          <div key={date} className="flex min-w-0 flex-col gap-1 px-[2px] pt-1">
            {(untimedByDate.get(date) ?? []).map((task) => {
              const pending = isPendingTask(task.id);
              const slot = colorOf(task);
              return (
                <button
                  key={task.id}
                  type="button"
                  /* Panel çapasını buradan taze okur — bkz. TaskBlock. */
                  data-task-id={task.id}
                  disabled={pending}
                  aria-busy={pending || undefined}
                  aria-label={`${task.title}, saatsiz`}
                  onPointerDown={(e) => {
                    if (pending) return;
                    onMoveStart(task, e);
                  }}
                  onClick={(e) => {
                    if (didDrag()) return;
                    onOpen(task, e.currentTarget.getBoundingClientRect());
                  }}
                  style={{
                    boxShadow: `inset 3px 0 0 0 ${
                      slot === null ? "var(--color-ink-3)" : slotVar(slot)
                    }`,
                  }}
                  className={cn(
                    "truncate rounded-[var(--r-md)] border px-1.5 py-0.5 text-left",
                    "text-[length:var(--text-2xs)] leading-tight",
                    "transition-colors duration-[var(--duration-fast)]",
                    pending
                      ? "cursor-default opacity-60"
                      : "hover:border-[var(--color-line-3)] hover:bg-[var(--color-surface-3)]",
                    task.done
                      ? "border-transparent bg-[var(--color-surface-2)] text-[var(--color-ink-3)] line-through"
                      : "border-[var(--color-line-2)] bg-[var(--color-surface)]",
                  )}
                >
                  {task.title}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
