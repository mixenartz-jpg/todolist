"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  endOfMonth,
  endOfIsoWeek,
  startOfIsoWeek,
  startOfMonth,
  eachDay,
  toParts,
  todayStr,
} from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { Button } from "@/components/Button";
import { Toast, useToast } from "@/components/Toast";
import { formatMonthYear, formatWeekRange } from "@/lib/ui/tr";
import { monthGrid } from "@/features/calendar/grid";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { TaskItem } from "@/features/tasks/TaskItem";
import {
  useCreateTask,
  useDeleteTask,
  useRenameTask,
  useReorderTasks,
  useRescheduleTask,
  useSetTaskTime,
  useToggleTask,
} from "@/features/tasks/mutations";
import { useTasks } from "@/features/tasks/queries";
import type { Task } from "@/features/tasks/types";
import { anchorForScale, buildPlanRange, type PlanScale } from "./plan";
import { planReorder } from "./reorder";
import { PlanBacklog } from "./PlanBacklog";
import { PlanDaySheet } from "./PlanDaySheet";
import { PlanMonthGrid } from "./PlanMonthGrid";
import { PlanScaleTabs } from "./PlanScaleTabs";
import { PlanWeekGrid } from "./PlanWeekGrid";
import "./plan.css";

/**
 * Plan ekranı — haftayı ve ayı KURMA yüzeyi.
 *
 * Ay ve Hafta ekranlarından farkı: tarihsiz görev havuzunu da getirir
 * ve onları günlere dağıtmayı sağlar. Bugüne kadar bu görevler yalnızca
 * Bugün ekranında, katlanmış bir bölümün içinde duruyordu; "şu işi bu
 * haftaya koyayım" hareketi hiçbir yerde yoktu.
 *
 * Bugün ekranıyla AYNI görev verisini gösterir — ayrı bir "plan"
 * tablosu yoktur. Buradan bir güne konan görev Bugün ekranında da
 * görünür; ekranlar tek doğruluk kaynağının farklı ölçekleridir.
 */
export function PlanScreen() {
  const today = useMemo(() => todayStr(), []);
  const toast = useToast();

  const [scale, setScale] = useState<PlanScale>("week");
  const [anchor, setAnchor] = useState<DateStr>(() => startOfIsoWeek(today));

  /** Havuzdan seçilen görev — ızgara yerleştirme moduna girer. */
  const [placingId, setPlacingId] = useState<string | null>(null);

  /** Ay ölçeğinde açılan gün paneli. */
  const [openDay, setOpenDay] = useState<DateStr | null>(null);

  const tasksQuery = useTasks();
  const createTask = useCreateTask(toast.show);
  const toggleTask = useToggleTask(toast.show);
  const deleteTask = useDeleteTask(toast.show);
  const rescheduleTask = useRescheduleTask(toast.show);
  const renameTask = useRenameTask(toast.show);
  const setTaskTime = useSetTaskTime(toast.show);
  const reorderTasks = useReorderTasks(toast.show);

  /*
   * Izgaranın çizeceği günler ve asıl aralık. Hafta ölçeğinde ikisi
   * aynı; ay ölçeğinde `monthGrid` komşu aylardan taşan günleri de
   * getirir ve onlar `scope` dışında kalır.
   */
  const { dates, scopeStart, scopeEnd } = useMemo(() => {
    if (scale === "week") {
      const end = endOfIsoWeek(anchor);
      return { dates: eachDay(anchor, end), scopeStart: anchor, scopeEnd: end };
    }

    const { year, month } = toParts(anchor);
    const cells = monthGrid(year, month);

    return {
      dates: cells.map((c) => c.date),
      scopeStart: startOfMonth(anchor),
      scopeEnd: endOfMonth(anchor),
    };
  }, [scale, anchor]);

  const range = useMemo(
    // `?? []` memo'nun İÇİNDE: dışarıda yazılsaydı her render'da yeni
    // bir dizi referansı üretir ve memo hiç tutmazdı.
    () => buildPlanRange(tasksQuery.data ?? [], dates, scopeStart, scopeEnd),
    [tasksQuery.data, dates, scopeStart, scopeEnd],
  );

  const placing = placingId !== null;

  /*
   * Yerleştirme modundan Esc ile çıkış. Bir modu açan her arayüz onu
   * kapatmanın klavye yolunu da vermeli; fare kullanmayan biri aksi
   * halde moda kilitlenirdi.
   */
  useEffect(() => {
    if (!placing) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPlacingId(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [placing]);

  function handlePlace(date: DateStr) {
    if (placingId === null) return;
    rescheduleTask.mutate({ id: placingId, dueDate: date });
    setPlacingId(null);
  }

  /** Görevi havuza geri atar — tarihini kaldırır. */
  function handleUnschedule(task: Task) {
    rescheduleTask.mutate({ id: task.id, dueDate: null });
  }

  const handleReorder = useCallback(
    (dayTasks: readonly Task[], task: Task, delta: -1 | 1) => {
      const patches = planReorder(dayTasks, task.id, delta);
      if (patches.length > 0) reorderTasks.mutate(patches);
    },
    [reorderTasks],
  );

  /** Izgara satırlarının ortak eylemleri — iki ölçekte de aynı. */
  const rowHandlers = {
    onAdd: (title: string, date: DateStr) =>
      createTask.mutate({ title, dueDate: date, note: null }),
    onToggle: (task: Task) =>
      toggleTask.mutate({ id: task.id, done: !task.done }),
    onDelete: (task: Task) => deleteTask.mutate(task.id),
    onRename: (task: Task, title: string) =>
      renameTask.mutate({ id: task.id, title }),
    onSetTime: (
      task: Task,
      startTime: string | null,
      durationMinutes: number | null,
    ) => setTaskTime.mutate({ id: task.id, startTime, durationMinutes }),
    onUnschedule: handleUnschedule,
    onReorder: handleReorder,
  };

  const openDayTasks =
    openDay === null
      ? []
      : (range.buckets.find((b) => b.date === openDay)?.tasks ?? []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PlanHeader
        scale={scale}
        anchor={anchor}
        today={today}
        openTotal={range.openTotal}
        onScaleChange={(next) => {
          setAnchor(anchorForScale(anchor, next, today));
          setScale(next);
        }}
        onShift={(direction) => setAnchor(shiftAnchor(anchor, scale, direction))}
        onToday={() =>
          setAnchor(
            scale === "week" ? startOfIsoWeek(today) : startOfMonth(today),
          )
        }
      />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        {tasksQuery.isPending ? (
          <PlanSkeleton scale={scale} />
        ) : (
          <>
            {/*
             * Gecikenler ızgaranın ÜSTÜNDE, hiçbir hücrenin içinde
             * değil: gecikmiş bir görev görüntülenen aralığın hiçbir
             * gününe değil, "şimdi"ye aittir.
             */}
            {range.overdue.length > 0 && (
              <section>
                <SectionHeading
                  sectionKey="plan.overdue"
                  onError={toast.show}
                  trailing={
                    <span className="tabular text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                      {range.overdue.length}
                    </span>
                  }
                />

                <ul className="flex flex-col gap-1.5">
                  {range.overdue.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      today={today}
                      onToggle={() =>
                        toggleTask.mutate({ id: task.id, done: !task.done })
                      }
                      onDelete={() => deleteTask.mutate(task.id)}
                      // Tek dokunuşluk çözüm yolu: gecikmeyi bugüne al.
                      onDefer={() =>
                        rescheduleTask.mutate({ id: task.id, dueDate: today })
                      }
                      onRename={(title) =>
                        renameTask.mutate({ id: task.id, title })
                      }
                    />
                  ))}
                </ul>
              </section>
            )}

            <div className="planLayout">
              <PlanBacklog
                tasks={range.backlog}
                selectedId={placingId}
                addPending={createTask.isPending}
                onSelect={setPlacingId}
                onAdd={(title) =>
                  createTask.mutate({ title, dueDate: null, note: null })
                }
                onError={toast.show}
              />

              {scale === "week" ? (
                <PlanWeekGrid
                  buckets={range.buckets}
                  today={today}
                  placing={placing}
                  addPending={createTask.isPending}
                  onPlace={handlePlace}
                  {...rowHandlers}
                />
              ) : (
                <PlanMonthGrid
                  buckets={range.buckets}
                  today={today}
                  placing={placing}
                  onSelect={(date) => {
                    // Yerleştirme modundayken tıklama günü AÇMAZ,
                    // görevi oraya koyar: kullanıcı zaten bir hedef
                    // seçmiş durumda.
                    if (placing) handlePlace(date);
                    else setOpenDay(date);
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

      {openDay !== null && (
        <PlanDaySheet
          date={openDay}
          today={today}
          tasks={openDayTasks}
          addPending={createTask.isPending}
          onClose={() => setOpenDay(null)}
          {...rowHandlers}
        />
      )}

      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </div>
  );
}

/** Çapayı bir ölçek ileri/geri taşır. */
function shiftAnchor(
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

function PlanHeader({
  scale,
  anchor,
  today,
  openTotal,
  onScaleChange,
  onShift,
  onToday,
}: {
  scale: PlanScale;
  anchor: DateStr;
  today: DateStr;
  openTotal: number;
  onScaleChange: (scale: PlanScale) => void;
  onShift: (direction: -1 | 1) => void;
  onToday: () => void;
}) {
  const isCurrent =
    scale === "week"
      ? anchor === startOfIsoWeek(today)
      : anchor === startOfMonth(today);

  const { year, month } = toParts(anchor);
  const title =
    scale === "week"
      ? formatWeekRange(anchor, addDays(anchor, 6))
      : formatMonthYear(year, month);

  return (
    <header className="border-b border-[var(--color-line)] px-4 py-3 md:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
          {title}
        </h1>

        <PlanScaleTabs scale={scale} onChange={onScaleChange} />

        {/* Yalnızca başka bir aralıktayken görünür: bulunduğun yere
            götüren bir düğme hiçbir şey yapmaz. */}
        {!isCurrent && (
          <Button size="sm" variant="ghost" onClick={onToday}>
            {scale === "week" ? "Bu hafta" : "Bu ay"}
          </Button>
        )}

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label={scale === "week" ? "Önceki hafta" : "Önceki ay"}
            onClick={() => onShift(-1)}
            className="px-2"
          >
            <Chevron direction="left" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={scale === "week" ? "Sonraki hafta" : "Sonraki ay"}
            onClick={() => onShift(1)}
            className="px-2"
          >
            <Chevron direction="right" />
          </Button>
        </div>
      </div>

      {openTotal > 0 && (
        <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          <span className="tabular">{openTotal}</span> açık iş
        </p>
      )}
    </header>
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

function PlanSkeleton({ scale }: { scale: PlanScale }) {
  const count = scale === "week" ? 7 : 35;

  return (
    <div
      className={scale === "week" ? "planWeekGrid" : "planMonthGrid"}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={
            scale === "week"
              ? "h-32 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
              : "aspect-square animate-pulse rounded-lg bg-[var(--color-surface-2)]"
          }
          style={{ animationDelay: `${i * 30}ms` }}
        />
      ))}
    </div>
  );
}
