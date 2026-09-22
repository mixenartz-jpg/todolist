"use client";

import { useEffect, useMemo, useState } from "react";
import {
  endOfIsoWeek,
  endOfMonth,
  startOfMonth,
  toParts,
} from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { ScreenBody } from "@/components/Screen";
import { Toast, useToast } from "@/components/Toast";
import { useTasks } from "@/features/tasks/queries";
import { monthGrid } from "./monthgrid";
import { buildPlanRange } from "./range";
import { goalProgress } from "./rollup";
import { CategoryFilterMenu } from "./CategoryFilterMenu";
import { daySummaries } from "./dayplan";
import { useSetTaskCategory, useSetTaskGoal } from "./mutations";
import { useMonthPlanDays, usePlanGoals } from "./queries";
import { PlanBacklog } from "./PlanBacklog";
import { PlanGoalStrip } from "./PlanGoalStrip";
import { PlanDayRow } from "./PlanDayRow";
import { PlanDaySheet } from "./PlanDaySheet";
import { PlanMonthMap } from "./PlanMonthMap";
import { PlanSheet } from "./PlanSheet";
import { PlanlamaHeader } from "./PlanlamaHeader";
import { PlanOverdue } from "./PlanOverdue";
import { PlanScaleToggle } from "./PlanScaleToggle";
import { PlanSkeleton } from "./PlanSkeleton";
import { usePlanlamaSurface } from "./usePlanlamaSurface";
import { usePlanCategories } from "./usePlanCategories";
import { useCollapsedDays } from "./useCollapsedDays";
import { weekSummaries } from "./weekmap";
import { usePlanTaskActions } from "./usePlanTaskActions";
import { eachDay } from "@/lib/date/date";
import "./planlama.css";

/**
 * Planlamanın takvim yüzeyi — TEK ekran, iki ölçek.
 *
 * ── Neden birleşti? ──
 * `/planlama/ay` ve `/planlama/hafta` ayrı rotalardı ve aynı satırı
 * çiziyorlardı; farkları görünmez ve tutarsızdı (gün numarasına basmak
 * ayda panel açıyor, haftada hiçbir şey yapmıyordu). İkisi ayrı ekran
 * değil, tek ekranın iki ölçeği — rota birleşince davranış da birleşti.
 *
 * Ayrıca çapa (`?t=`) artık her zaman bir GÜN; ölçek onu hizalıyor.
 * Eskiden `?ay=` ölçeğe göre iki farklı tarihe çözülüyordu ve Ağustos'a
 * bakarken Hafta'ya geçen kullanıcı Temmuz'a düşüyordu.
 */
export function PlanlamaScreen() {
  const toast = useToast();
  const {
    today,
    anchor,
    scale,
    category,
    setAnchor,
    setScale,
    goToWeek,
    setCategory,
  } = usePlanlamaSurface();
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
   * Ölçek yalnızca ARALIĞI belirler.
   *
   * Ay: `monthGrid` komşu aylardan taşan günleri de getirir; onlar
   * `scope` dışında kalır ama gerçek günlerdir ve görev alabilirler.
   * Hafta: yedi gün, taşma yok, hepsi kapsamda.
   */
  const { dates, scopeStart, scopeEnd } = useMemo(() => {
    if (scale === "week") {
      const end = endOfIsoWeek(anchor);
      return {
        dates: eachDay(anchor, end),
        scopeStart: anchor,
        scopeEnd: end,
      };
    }

    const { year, month } = toParts(anchor);
    return {
      dates: monthGrid(year, month).map((c) => c.date),
      scopeStart: startOfMonth(anchor),
      scopeEnd: endOfMonth(anchor),
    };
  }, [anchor, scale]);

  /*
   * Filtre `buildPlanRange`e GİRERKEN uygulanır, çıkarken değil:
   * böylece openTotal, overdue ve backlog sayaçlarının hepsi filtreye
   * kendiliğinden uyar (bkz. filter.ts).
   */
  const range = useMemo(
    () => buildPlanRange(categories.visible, dates, scopeStart, scopeEnd),
    [categories.visible, dates, scopeStart, scopeEnd],
  );

  /* Hangi günlerde plan yazılı — hücre noktaları için. */
  const planDaysQuery = useMonthPlanDays(scopeStart, scopeEnd, scopeStart);

  const summaries = useMemo(
    () => daySummaries(range.buckets, planDaysQuery.data ?? new Set()),
    [range.buckets, planDaysQuery.data],
  );

  /*
   * Ay ölçeğinin hafta satırları.
   *
   * HER ZAMAN hesaplanır, `scale === "month"` iken değil: React
   * hook kuralı `useMemo`'nun koşullu çağrılmasına izin vermiyor.
   * Hafta ölçeğinde sonuç kullanılmıyor ve maliyeti yedi kovanın
   * toplanması — ölçülebilir değil.
   */
  const haftalar = useMemo(
    () => weekSummaries(range.buckets, today),
    [range.buckets, today],
  );

  /* Ayın hedefleri — gün panelindeki hedef seçici için. */
  const goalsQuery = usePlanGoals(startOfMonth(anchor));

  /*
   * Hedef şeridinin satırları — ilerlemeleriyle.
   *
   * İlerleme `goalProgress`'ten geliyor ve o bağlı GÖREVLERE bakıyor;
   * bu yüzden filtrelenmiş `categories.visible` değil TÜM görevler
   * geçiliyor. Filtrelenmiş liste verilseydi kategori süzgeci açıkken
   * hedefin ilerlemesi düşer ve kullanıcı "hedefim geriledi" sanırdı —
   * halbuki yalnızca bakış daralmış olurdu.
   */
  const goalRows = useMemo(
    () => (goalsQuery.data ?? []).map((g) => goalProgress(g, tasksQuery.data ?? [])),
    [goalsQuery.data, tasksQuery.data],
  );


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
        scale={scale}
        anchor={anchor}
        today={today}
        openTotal={range.openTotal}
        onAnchorChange={setAnchor}
      >
        <div className="flex flex-wrap items-center gap-2">
          <PlanScaleToggle value={scale} onChange={setScale} />
          <CategoryFilterMenu
            categories={categories.active}
            value={category}
            onChange={setCategory}
            counts={categories.counts}
            uncategorizedCount={categories.uncategorizedCount}
          />
        </div>
      </PlanlamaHeader>

      <ScreenBody width="6xl">
        {tasksQuery.isPending ? (
          <PlanSkeleton scale={scale} />
        ) : (
          <>
            {/*
              * Hedefler EN ÜSTTE: planı yaparken "neden" gözün
              * önünde olmalı. Gecikenler ve ızgara "ne" — onlar
              * hedefin altında geliyor.
              */}
            <PlanGoalStrip
              goals={goalRows}
              /* Türetilen iş ÇAPAYA düşer: hafta ölçeğinde haftanın
                 Pazartesi'si, ay ölçeğinde ayın 1'i. Kullanıcının
                 baktığı dönemin başı, bugün DEĞİL — geçmiş bir aya
                 bakarken bugüne iş düşmesi şaşırtıcı olurdu. */
              defaultDate={anchor}
              addPending={actions.addPending}
              onAddTask={actions.onAddForGoal}
            />

            <PlanOverdue
              tasks={range.overdue}
              today={today}
              actions={actions}
              onError={toast.show}
            />

            {/* Havuz ≥1280px'de SAĞDA, altında üstte.

                DOM sırası: kağıt ÖNCE. Havuz görsel olarak sağda ama
                okuma ve klavye sırasında ikincil — asıl yüzey kağıt. */}
            <div className="planLayout">
              {/*
                * Ölçek artık AYNI satırı iki aralıkta değil, İKİ
                * FARKLI ŞEYİ çiziyor — `PlanGrid`'in emekli olma
                * sebebi buydu. Hafta günleri gösterir (iş yapılan
                * yüzey), ay haftaları (gezinilen harita).
                */}
              {scale === "week" ? (
                <PlanSheet>
                  {range.buckets.map((bucket) => (
                    <PlanDayRow
                      key={bucket.date}
                      bucket={bucket}
                      today={today}
                      hasPlan={summaries.get(bucket.date)?.hasPlan ?? false}
                      categoryById={categories.categoryById}
                      placing={placing}
                      addPending={actions.addPending}
                      inScope={bucket.inScope}
                      collapsed={collapsedDays.has(bucket.date)}
                      onToggleCollapsed={toggleCollapsed}
                      // Gün numarası yerleştirme modunda da paneli
                      // açar: yerleştirmenin kendi düğmesi var, aynı
                      // hedefin anlamı moda göre değişmemeli.
                      onOpenDay={setOpenDay}
                      onPlace={handlePlace}
                      onAdd={actions.onAdd}
                      onToggle={actions.onToggle}
                      onDelete={actions.onDelete}
                      onRename={actions.onRename}
                      onUnschedule={actions.onUnschedule}
                      onReorder={actions.onReorder}
                    />
                  ))}
                </PlanSheet>
              ) : (
                <PlanMonthMap
                  haftalar={haftalar}
                  /*
                   * TEK çağrı: çapa ve ölçek birlikte yazılır.
                   * `setAnchor` ile `setScale`'i ardışık çağırmak,
                   * ikisi de aynı URL anlık görüntüsünü kapattığı
                   * için çapayı düşürürdü (gerekçe `goToWeek`'te).
                   */
                  onSelectWeek={goToWeek}
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

      {openDay !== null && (
        <PlanDaySheet
          date={openDay}
          today={today}
          tasks={openDayTasks}
          categories={categories.all}
          goals={goalsQuery.data ?? []}
          onError={toast.show}
          onSetCategory={(t, categoryId) =>
            setTaskCategory.mutate({ id: t.id, categoryId })
          }
          onSetGoal={(t, goalId) => setTaskGoal.mutate({ id: t.id, goalId })}
          onClose={() => setOpenDay(null)}
          onToggle={actions.onToggle}
          onDelete={actions.onDelete}
          onRename={actions.onRename}
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
