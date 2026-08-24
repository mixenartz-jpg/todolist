"use client";

import { useMemo } from "react";
import { startOfIsoWeek, startOfMonth } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { useStepGoalProgress } from "@/features/planlama/mutations";
import { usePlanGoals, useWeekGoals } from "@/features/planlama/queries";
import { weekSlicesByGoal } from "@/features/planlama/weekchain";
import { goalProgress } from "@/features/planlama/rollup";
import { useTasks } from "@/features/tasks/queries";
import { RailEmpty, RailGoalRow } from "./RailGoalRow";

/**
 * Bu ayın hedefleri — rayın üçüncü bloğu.
 *
 * ── İlerleme neden `goalProgress` ile okunuyor? ──
 * Aylık hedefin ilerlemesinin İKİ kaynağı var (sayısal hedef ya da
 * bağlı görevler) ve hangisinin kazandığı `rollup.ts`'te yazılı bir
 * karar. Burada `doneCount/targetCount`'u elle bölmek, sayaçsız ama
 * göreve bağlı hedefleri "0/—" diye göstermek olurdu: Özet ekranı
 * ilerleme gösterirken ray boş görünürdü.
 *
 * ── Arşivlenmişler neden yok? ──
 * Arşiv "artık takip etmiyorum" demek. Günü kuran sütunda takip
 * edilmeyen hedefi göstermek, rayı geçmişin çöplüğüne çevirirdi.
 */
export function RailMonthGoals({
  today,
  onError,
}: {
  today: DateStr;
  onError?: (message: string) => void;
}) {
  const month = startOfMonth(today);
  const goalsQuery = usePlanGoals(month);

  /*
   * Bu haftanın hedefleri — aylık hedefin altına "bu haftaki dilimin"
   * yazılabilmesi için. `RailWeekGoals` ile AYNI sorgu anahtarı,
   * dolayısıyla ikinci bir ağ isteği açmaz.
   */
  const weekGoalsQuery = useWeekGoals(startOfIsoWeek(today));
  const tasksQuery = useTasks();
  const stepGoal = useStepGoalProgress(onError);

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const goals = useMemo(
    () => (goalsQuery.data ?? []).filter((g) => g.archivedAt === null),
    [goalsQuery.data],
  );

  const slices = useMemo(
    () => weekSlicesByGoal(weekGoalsQuery.data ?? []),
    [weekGoalsQuery.data],
  );

  if (goalsQuery.isPending) return null;

  /* Hata ≠ boş liste — gerekçe `RailWeekGoals`'ta. */
  if (goalsQuery.isError) {
    return (
      <section>
        <SectionHeading sectionKey="today.monthGoals" onError={onError} />
        <RailEmpty>Hedefler yüklenemedi.</RailEmpty>
      </section>
    );
  }

  return (
    <section>
      <SectionHeading sectionKey="today.monthGoals" onError={onError} />

      {goals.length === 0 ? (
        <RailEmpty>Bu ay için hedef yok.</RailEmpty>
      ) : (
        <ul className="flex flex-col">
          {goals.map((goal) => {
            const progress = goalProgress(goal, tasks);

            /*
             * Sayaçlı hedef ELLE artırılır; göreve bağlı hedefin
             * sayacı ise görevlerden türer ve rayda artırılamaz —
             * artırmak, görevleri yok sayıp `doneCount`'u kirletirdi
             * (`goalProgress`'te "sayısal hedef görevleri yener").
             */
            const canStep = goal.targetCount !== null;

            return (
              <RailGoalRow
                slices={slices.get(goal.id)}
                key={goal.id}
                title={goal.title}
                colorSlot={goal.colorSlot}
                doneCount={
                  canStep ? goal.doneCount : progress.taskDone
                }
                targetCount={
                  canStep ? goal.targetCount : progress.taskTotal || null
                }
                done={progress.ratio !== null && progress.ratio >= 1}
                onStep={
                  canStep
                    ? () =>
                        stepGoal.mutate({
                          id: goal.id,
                          month,
                          doneCount: goal.doneCount + 1,
                        })
                    : undefined
                }
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
