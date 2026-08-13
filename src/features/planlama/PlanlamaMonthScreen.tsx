"use client";
import { ScreenBody } from "@/components/Screen";

import { useEffect, useMemo, useState } from "react";
import { endOfMonth, startOfMonth, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { Toast, useToast } from "@/components/Toast";
import { monthGrid } from "@/features/calendar/grid";
import { useTasks } from "@/features/tasks/queries";
import { buildPlanRange } from "./range";
import { CategoryFilterBar } from "./CategoryFilterBar";
import { daySummaries } from "./dayplan";
import { useSetTaskCategory, useSetTaskGoal } from "./mutations";
import { useMonthPlanDays, usePlanGoals } from "./queries";
import { PlanBacklog } from "./PlanBacklog";
import { PlanDaySheet } from "./PlanDaySheet";
import { PlanlamaHeader } from "./PlanlamaHeader";
import { PlanMonthGrid } from "./PlanMonthGrid";
import { PlanOverdue } from "./PlanOverdue";
import { PlanSkeleton } from "./PlanSkeleton";
import { usePlanlamaSurface } from "./usePlanlamaSurface";
import { usePlanCategories } from "./usePlanCategories";
import { useCollapsedDays } from "./useCollapsedDays";
import { usePlanTaskActions } from "./usePlanTaskActions";
import "./planlama.css";

/**
 * Ayı KURMA yüzeyi — Planlamanın varsayılan görünümü.
 *
 * Hafta ekranıyla aynı veriyi farklı ölçekte gösterir: ay, hafta
 * SATIRLARI hâlinde aşağı kaydırılır ve her gün kutusu gerçek görev
 * satırları taşır. Önceki sürüm kare hücrelerde yalnızca sayı
 * gösteriyordu; "hangileri" sorusu her gün için ayrı bir panel
 * tıklaması istiyordu.
 *
 * Gün paneli DURUYOR ama artık tek yol değil: plan metni, kategori ve
 * hedef seçicileri yalnızca orada, satırları düzenlemekse kutuda.
 */
export function PlanlamaMonthScreen() {
  const toast = useToast();
  const { today, anchor, category, setAnchor, setCategory } =
    usePlanlamaSurface("month");
  const actions = usePlanTaskActions(toast.show);
  const { collapsedDays, toggleCollapsed } = useCollapsedDays(anchor);

  /** Havuzdan seçilen görev — ızgara yerleştirme moduna girer. */
  const [placingId, setPlacingId] = useState<string | null>(null);
  /** Açılan gün paneli. */
  const [openDay, setOpenDay] = useState<DateStr | null>(null);

  const tasksQuery = useTasks();
  const categories = usePlanCategories(tasksQuery.data, category);
  const setTaskCategory = useSetTaskCategory(toast.show);
  const setTaskGoal = useSetTaskGoal(toast.show);

  /*
   * `monthGrid` komşu aylardan taşan günleri de getirir; onlar
   * `scope` dışında kalır ama gerçek günlerdir ve görev alabilirler.
   */
  const { dates, scopeStart, scopeEnd } = useMemo(() => {
    const { year, month } = toParts(anchor);
    return {
      dates: monthGrid(year, month).map((c) => c.date),
      scopeStart: startOfMonth(anchor),
      scopeEnd: endOfMonth(anchor),
    };
  }, [anchor]);

  /*
   * Filtre `buildPlanRange`e GİRERKEN uygulanır, çıkarken değil:
   * böylece openTotal, overdue ve backlog sayaçlarının hepsi filtreye
   * kendiliğinden uyar (bkz. filter.ts).
   */
  const range = useMemo(
    () => buildPlanRange(categories.visible, dates, scopeStart, scopeEnd),
    [categories.visible, dates, scopeStart, scopeEnd],
  );

  /* Ayın hangi günlerinde plan yazılı — hücre noktaları için. */
  const planDaysQuery = useMonthPlanDays(scopeStart, scopeEnd, scopeStart);

  const summaries = useMemo(
    () => daySummaries(range.buckets, planDaysQuery.data ?? new Set()),
    [range.buckets, planDaysQuery.data],
  );

  /* Ayın hedefleri — gün panelindeki hedef seçici için. */
  const goalsQuery = usePlanGoals(scopeStart);

  const placing = placingId !== null;

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

  const openDayTasks =
    openDay === null
      ? []
      : (range.buckets.find((b) => b.date === openDay)?.tasks ?? []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PlanlamaHeader
        scale="month"
        anchor={anchor}
        today={today}
        openTotal={range.openTotal}
        onAnchorChange={setAnchor}
      >
        <CategoryFilterBar
          categories={categories.active}
          value={category}
          onChange={setCategory}
          counts={categories.counts}
          uncategorizedCount={categories.uncategorizedCount}
        />
      </PlanlamaHeader>

      <ScreenBody width="6xl">
        {tasksQuery.isPending ? (
          <PlanSkeleton scale="month" />
        ) : (
          <>
            <PlanOverdue
              tasks={range.overdue}
              today={today}
              actions={actions}
              onError={toast.show}
            />

            {/* Havuz ≥1280px'de SAĞDA, altında üstte. Eski yerleşimde
                üste alınmıştı çünkü 16rem'lik sütun 7 gün kutusunu
                ~113px'e indiriyordu; ajanda kağıdı tek sütun olduğu için
                o hesap düştü (bkz. planlama.css → .planLayout).

                DOM sırası: kağıt ÖNCE. Havuz görsel olarak sağda ama
                okuma ve klavye sırasında ikincil — asıl yüzey kağıt. */}
            <div className="planLayout">
              <PlanMonthGrid
                buckets={range.buckets}
                today={today}
                summaries={summaries}
                categoryById={categories.categoryById}
                placing={placing}
                addPending={actions.addPending}
                collapsedDays={collapsedDays}
                onToggleCollapsed={toggleCollapsed}
                onPlace={handlePlace}
                // Gün numarası yerleştirme modunda da paneli açar:
                // yerleştirmenin kendi düğmesi var, aynı hedefin anlamı
                // moda göre değişmemeli.
                onOpenDay={setOpenDay}
                onAdd={actions.onAdd}
                onToggle={actions.onToggle}
                onDelete={actions.onDelete}
                onRename={actions.onRename}
                onSetTime={actions.onSetTime}
                onUnschedule={actions.onUnschedule}
                onReorder={actions.onReorder}
              />

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

      {openDay !== null && (
        <PlanDaySheet
          date={openDay}
          today={today}
          tasks={openDayTasks}
          categories={categories.all}
          goals={goalsQuery.data ?? []}
          addPending={actions.addPending}
          onError={toast.show}
          onSetCategory={(t, categoryId) =>
            setTaskCategory.mutate({ id: t.id, categoryId })
          }
          onSetGoal={(t, goalId) => setTaskGoal.mutate({ id: t.id, goalId })}
          onClose={() => setOpenDay(null)}
          onAdd={actions.onAdd}
          onToggle={actions.onToggle}
          onDelete={actions.onDelete}
          onRename={actions.onRename}
          onSetTime={actions.onSetTime}
          onUnschedule={actions.onUnschedule}
          onReorder={actions.onReorder}
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
