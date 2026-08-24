"use client";
import { ScreenBody } from "@/components/Screen";

import { useCallback, useEffect, useMemo, useState } from "react";
import { eachDay, endOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { Toast, useToast } from "@/components/Toast";
import { useTasks } from "@/features/tasks/queries";
import { buildPlanRange } from "./range";
import { CategoryFilterBar } from "./CategoryFilterBar";
import { PlanBacklog } from "./PlanBacklog";
import { PlanlamaHeader } from "./PlanlamaHeader";
import { usePlanCategories } from "./usePlanCategories";
import { PlanOverdue } from "./PlanOverdue";
import { PlanSkeleton } from "./PlanSkeleton";
import { PlanWeekGrid } from "./PlanWeekGrid";
import { PlanWeekTimeGrid } from "./PlanWeekTimeGrid";
import { PlanViewToggle } from "./PlanViewToggle";
import { usePlanlamaSurface } from "./usePlanlamaSurface";
import { usePlanViewMode } from "./usePlanViewMode";
import { useCollapsedDays } from "./useCollapsedDays";
import { usePlanTaskActions } from "./usePlanTaskActions";
import { TaskPopover } from "@/features/taskpopover/TaskPopover";
import { useTaskPopoverActions } from "@/features/taskpopover/useTaskPopoverActions";
import type { Task } from "@/features/tasks/types";
import "./planlama.css";

/**
 * Haftayı KURMA yüzeyi.
 *
 * Takvim > Hafta ekranından farkı: tarihsiz görev havuzunu da getirir
 * ve onları günlere dağıtmayı sağlar. O ekran BAKMAK içindir, bu
 * kurmak için.
 *
 * Bugün ekranıyla AYNI görev verisini gösterir — ayrı bir "plan"
 * tablosu yoktur. Buradan bir güne konan görev Bugün ekranında da
 * görünür; ekranlar tek doğruluk kaynağının farklı ölçekleridir.
 */
export function PlanlamaWeekScreen() {
  const toast = useToast();
  const { today, anchor, category, setAnchor, setCategory } =
    usePlanlamaSurface("week");
  const actions = usePlanTaskActions(toast.show);
  const { collapsedDays, toggleCollapsed } = useCollapsedDays(anchor);
  const { mode, setMode } = usePlanViewMode();
  const popoverActions = useTaskPopoverActions(today, toast.show);

  /*
   * Izgarada tıklanan görev — düzenleme paneli bloğun yanında açılır.
   * Kimlik + tıklama anındaki rect; gerekçe TodayScreen'de aynı yerde.
   */
  const [openTask, setOpenTask] = useState<{ id: string; rect: DOMRect } | null>(
    null,
  );

  const handleOpen = useCallback((task: Task, anchorRect: DOMRect) => {
    setOpenTask((current) =>
      current?.id === task.id ? null : { id: task.id, rect: anchorRect },
    );
  }, []);

  const closePopover = useCallback(() => setOpenTask(null), []);

  /** Havuzdan seçilen görev — ızgara yerleştirme moduna girer. */
  const [placingId, setPlacingId] = useState<string | null>(null);

  const tasksQuery = useTasks();
  const categories = usePlanCategories(tasksQuery.data, category);

  const { dates, scopeEnd } = useMemo(() => {
    const end = endOfIsoWeek(anchor);
    return { dates: eachDay(anchor, end), scopeEnd: end };
  }, [anchor]);

  /*
   * Filtre `buildPlanRange`'e GİRERKEN uygulanır, çıkarken değil:
   * böylece openTotal, overdue ve backlog sayaçlarının hepsi filtreye
   * kendiliğinden uyar (bkz. filter.ts).
   */
  const range = useMemo(
    () => buildPlanRange(categories.visible, dates, anchor, scopeEnd),
    [categories.visible, dates, anchor, scopeEnd],
  );

  const placing = placingId !== null;

  /*
   * Izgaraya giden görevler KOVALARDAN düzleştirilir, `tasksQuery.data`
   * ham hâlinden DEĞİL: kategori filtresi `buildPlanRange`'e girerken
   * uygulanıyor ve ham veri verilseydi filtre listede çalışır, ızgarada
   * sessizce çalışmazdı.
   */
  const gridTasks = useMemo(
    () => range.buckets.flatMap((bucket) => bucket.tasks),
    [range.buckets],
  );

  /* Panel nesnesi her render'da önbellekten TAZE okunur. */
  const openedTask = useMemo(
    () =>
      openTask === null
        ? null
        : ((tasksQuery.data ?? []).find((t) => t.id === openTask.id) ?? null),
    [openTask, tasksQuery.data],
  );

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
    actions.reschedule(placingId, date);
    setPlacingId(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PlanlamaHeader
        scale="week"
        anchor={anchor}
        today={today}
        openTotal={range.openTotal}
        onAnchorChange={setAnchor}
      >
        {/* İki ayar yan yana: filtre solda büyür, görünüm anahtarı
            sağa yaslı kalır. */}
        <div className="flex flex-wrap items-center gap-2">
          <CategoryFilterBar
            categories={categories.active}
            value={category}
            onChange={setCategory}
            counts={categories.counts}
            uncategorizedCount={categories.uncategorizedCount}
          />

          <div className="ml-auto">
            <PlanViewToggle mode={mode} onChange={setMode} />
          </div>
        </div>
      </PlanlamaHeader>

      <ScreenBody width="6xl">
        {tasksQuery.isPending ? (
          <PlanSkeleton scale="week" />
        ) : (
          <>
            <PlanOverdue
              tasks={range.overdue}
              today={today}
              actions={actions}
              onError={toast.show}
            />

            {/* Kağıt ÖNCE, havuz sonra — ay ekranıyla aynı sıra.
                Havuz ≥1280px'de sağda, altında üstte. */}
            <div className="planLayout">
              {mode === "grid" ? (
                <PlanWeekTimeGrid
                  dates={dates}
                  today={today}
                  tasks={gridTasks}
                  categoryById={categories.categoryById}
                  actions={actions}
                  placing={placing}
                  onPlace={handlePlace}
                  onOpen={handleOpen}
                  onError={toast.show}
                />
              ) : (
                <PlanWeekGrid
                  buckets={range.buckets}
                  today={today}
                  categoryById={categories.categoryById}
                  placing={placing}
                  addPending={actions.addPending}
                  collapsedDays={collapsedDays}
                  onToggleCollapsed={toggleCollapsed}
                  onPlace={handlePlace}
                  onAdd={actions.onAdd}
                  onToggle={actions.onToggle}
                  onDelete={actions.onDelete}
                  onRename={actions.onRename}
                  onSetTime={actions.onSetTime}
                  onUnschedule={actions.onUnschedule}
                  onReorder={actions.onReorder}
                />
              )}

              <PlanBacklog
                tasks={range.backlog}
                categoryById={categories.categoryById}
                selectedId={placingId}
                addPending={actions.addPending}
                onSelect={setPlacingId}
                onAdd={actions.addBacklog}
                onError={toast.show}
              />
            </div>
          </>
        )}
      </ScreenBody>

      {/* Izgarada seçilen görevin düzenleme paneli — Bugün ekranıyla
          AYNI bileşen, dolayısıyla aynı davranış. */}
      {openedTask && openTask && (
        <TaskPopover
          task={openedTask}
          anchorRect={openTask.rect}
          inheritedColor={
            openedTask.categoryId
              ? (categories.categoryById.get(openedTask.categoryId)?.colorSlot ??
                null)
              : null
          }
          actions={popoverActions}
          onClose={closePopover}
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
