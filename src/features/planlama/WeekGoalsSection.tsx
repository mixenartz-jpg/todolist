"use client";

import { useMemo, useState } from "react";
import { startOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { Button } from "@/components/Button";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { WeekGoalCard } from "./WeekGoalCard";
import { WeekGoalForm } from "./WeekGoalForm";
import {
  useCreateWeekGoal,
  useDeleteWeekGoal,
  useStepWeekGoal,
  useToggleWeekGoalDone,
  useUpdateWeekGoal,
} from "./mutations";
import { useWeekGoals } from "./queries";
import type { PlanGoal } from "./types";
import "./planlama.css";

interface WeekGoalsSectionProps {
  /** Ayın çapası — bu haftanın hangi haftaya düştüğünü belirler. */
  anchor: DateStr;
  today: DateStr;
  /** Ayın hedefleri — haftalık hedefin hangisine hizmet ettiği için. */
  monthGoals: readonly PlanGoal[];
  onError: (text: string) => void;
}

/**
 * Bu haftanın hedefleri — Hedefler ekranının ikinci bölümü.
 *
 * ── Neden ayrı SEKME değildi de bölüm oldu? ──
 * "Haftalık" beşinci bir sekmeydi ve aylık hedeflerden habersiz bir
 * liste çiziyordu. Oysa 0014 `week_goals.plan_goal_id` ile bir BAĞ
 * kurmuştu: haftalık hedef, aylık hedefin dilimi olabilir. O bağ
 * yalnızca haftalık karttan yukarı doğru okunuyordu ("bu hedef şu ay
 * hedefine hizmet ediyor") ve aşağı doğru hiç görünmüyordu — aylık
 * hedefe bakan kullanıcı dilimlerini göremiyordu.
 *
 * Aynı ekrana gelince bağ iki yönlü okunur oldu ve sekme çubuğu da bir
 * sekme eksildi.
 *
 * ── Neden bu haftanın hedefleri, ayın TÜM haftalarının değil? ──
 * Hedefler ekranı bir AY ekranıdır; ayın beş haftasının hedeflerini de
 * listelemek onu bir hafta listesine çevirirdi. Ayın hangi haftasında
 * ne hedeflendiği Plan yüzeyinin hafta başlıklarında görünüyor (orası
 * zaten hafta hafta bölünmüş). Burada yalnızca İÇİNDE BULUNULAN hafta
 * var: "şu an neyi hedefliyorum" sorusu.
 */
export function WeekGoalsSection({
  anchor,
  today,
  monthGoals,
  onError,
}: WeekGoalsSectionProps) {
  /*
   * Hangi hafta? Görüntülenen ay BUGÜNÜN ayıysa bugünün haftası,
   * değilse ayın ilk haftası. Geçmiş bir aya bakarken "bugünün
   * haftası" o ayın dışına düşerdi.
   */
  const weekStart = useMemo(() => {
    const sameMonth = anchor.slice(0, 7) === today.slice(0, 7);
    return startOfIsoWeek(sameMonth ? today : anchor);
  }, [anchor, today]);

  const goalsQuery = useWeekGoals(weekStart);

  const monthGoalById = useMemo(
    () => new Map(monthGoals.map((g) => [g.id, g])),
    [monthGoals],
  );

  const createGoal = useCreateWeekGoal(onError);
  const updateGoal = useUpdateWeekGoal(onError);
  const stepGoal = useStepWeekGoal(onError);
  const toggleDone = useToggleWeekGoalDone(onError);
  const deleteGoal = useDeleteWeekGoal(onError);

  const [adding, setAdding] = useState(false);

  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);

  /*
   * Sayaç AÇIK hedefleri sayar. Hepsini saysaydı hafta ilerledikçe
   * rakam hiç azalmaz ve ilerleme hissi kaybolurdu (aylık hedeflerin
   * sayacıyla aynı gerekçe).
   */
  const openGoals = goals.filter((goal) => goal.completedAt === null).length;

  return (
    <section className="mt-[var(--stack-gap)]">
      <SectionHeading
        sectionKey="planlama.weekGoals"
        onError={onError}
        trailing={
          openGoals > 0 ? (
            <span className="tabular text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              {openGoals}
            </span>
          ) : undefined
        }
      />

      {goalsQuery.isPending ? (
        <div className="flex flex-col gap-2" aria-hidden>
          <div className="h-20 animate-pulse rounded-xl bg-[var(--color-surface-2)]" />
        </div>
      ) : (
        <>
          {goals.length === 0 ? (
            <p className="text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-3)]">
              Bu hafta için hedef yok. Pazartesi birkaç madde yazmak,
              haftanın sonunda neyi bitirdiğini görünür kılar.
            </p>
          ) : (
            <ul className="goalList">
              {goals.map((goal) => (
                <WeekGoalCard
                  key={goal.id}
                  goal={goal}
                  parent={
                    goal.planGoalId === null
                      ? null
                      : (monthGoalById.get(goal.planGoalId) ?? null)
                  }
                  pending={updateGoal.isPending}
                  onUpdate={(draft) =>
                    updateGoal.mutate({
                      id: goal.id,
                      weekStart,
                      title: draft.title,
                      note: draft.note,
                      targetCount: draft.targetCount,
                      colorSlot: draft.colorSlot,
                      planGoalId: draft.planGoalId,
                      // Formda düzenlenmiyor; hedef sayısının GERÇEKTEN
                      // değişip değişmediğini anlamak ve sayacı kırpmak
                      // için gerekli (bkz. recountOnTargetChange).
                      previous: {
                        doneCount: goal.doneCount,
                        completedAt: goal.completedAt,
                        targetCount: goal.targetCount,
                      },
                    })
                  }
                  onStep={(doneCount) =>
                    stepGoal.mutate({
                      id: goal.id,
                      weekStart,
                      doneCount,
                      targetCount: goal.targetCount,
                    })
                  }
                  onToggleDone={(done) =>
                    toggleDone.mutate({ id: goal.id, weekStart, done })
                  }
                  onDelete={() => deleteGoal.mutate({ id: goal.id, weekStart })}
                />
              ))}
            </ul>
          )}

          {adding ? (
            <div className="mt-2 rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-3.5">
              <WeekGoalForm
                weekStart={weekStart}
                sortOrder={goals.length}
                pending={createGoal.isPending}
                onSubmit={(draft) => {
                  createGoal.mutate(draft);
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            </div>
          ) : (
            <div className="mt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setAdding(true)}
              >
                Haftalık hedef ekle
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
