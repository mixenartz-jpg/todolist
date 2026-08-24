"use client";

import { startOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { useStepWeekGoal } from "@/features/planlama/mutations";
import { useWeekGoals } from "@/features/planlama/queries";
import { RailEmpty, RailGoalRow } from "./RailGoalRow";

/**
 * Bu haftanın hedefleri — rayın ikinci bloğu.
 *
 * Çapa BUGÜNÜN haftası, `usePlanlamaSurface` DEĞİL: ray günü kurma
 * yüzeyidir ve "bu hafta" burada her zaman içinde bulunulan haftadır.
 * Planlama'nın `?ay=` çapasını buraya bağlamak, Bugün ekranındaki
 * "bu hafta"nın başka bir sekmede gezinilen haftaya kaymasına yol
 * açardı.
 */
export function RailWeekGoals({
  today,
  onError,
}: {
  today: DateStr;
  onError?: (message: string) => void;
}) {
  const weekStart = startOfIsoWeek(today);
  const goalsQuery = useWeekGoals(weekStart);
  const stepGoal = useStepWeekGoal(onError);

  const goals = goalsQuery.data ?? [];

  // Yüklenirken hiçbir şey çizilmez: rayda iskelet, dört blok için
  // dört ayrı titreşim demekti ve göz nereye bakacağını şaşırırdı.
  if (goalsQuery.isPending) return null;

  /*
   * Hata boş listeden AYRI gösterilir. İkisi de "hedef yok" diye
   * çizilseydi, hedefleri olan ama sorgusu düşen kullanıcı onları
   * silinmiş sanardı — sessiz veri kaybı görüntüsü, gerçek veri
   * kaybından daha az korkutucu değil.
   */
  if (goalsQuery.isError) {
    return (
      <section>
        <SectionHeading sectionKey="today.weekGoals" onError={onError} />
        <RailEmpty>Hedefler yüklenemedi.</RailEmpty>
      </section>
    );
  }

  return (
    <section>
      <SectionHeading sectionKey="today.weekGoals" onError={onError} />

      {goals.length === 0 ? (
        <RailEmpty>Bu hafta için hedef yok.</RailEmpty>
      ) : (
        <ul className="flex flex-col">
          {goals.map((goal) => (
            <RailGoalRow
              key={goal.id}
              title={goal.title}
              colorSlot={goal.colorSlot}
              doneCount={goal.doneCount}
              targetCount={goal.targetCount}
              done={goal.completedAt !== null}
              onStep={() =>
                stepGoal.mutate({
                  id: goal.id,
                  weekStart,
                  doneCount: goal.doneCount + 1,
                  targetCount: goal.targetCount,
                })
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}
