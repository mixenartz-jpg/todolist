"use client";
import { ScreenBody } from "@/components/Screen";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Toast, useToast } from "@/components/Toast";
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
import { PlanlamaHeader } from "./PlanlamaHeader";
import { useWeekGoals } from "./queries";
import { usePlanlamaSurface } from "./usePlanlamaSurface";
import "./planlama.css";

/**
 * Haftalık hedefler.
 *
 * ── Neden ay ve gün arasında üçüncü bir ölçek? ──
 * Aylık hedef ("bu ay 30 deneme") planlarken uzak, günlük görev
 * yaparken dar. Arada "bu hafta üç bölüm bitir" ölçeği vardı ve
 * kullanıcı onu aylık hedefe sıkıştırmak zorunda kalıyordu; o zaman ay
 * sonunda hangi haftada neyin bittiği kayboluyordu.
 *
 * ── Çapa neden Hafta ızgarasıyla paylaşılıyor? ──
 * `usePlanlamaSurface("week")` URL'deki `?ay=` değerini pazartesiye
 * hizalar — Hafta sekmesinin kullandığı çapanın aynısı. Ağustos'un
 * ikinci haftasının ızgarasına bakarken "Haftalık"a basan kullanıcı o
 * haftanın hedeflerini bulmalı, bu haftanınkileri değil. Parametrenin
 * adı `ay` ama işlevi "seçili dönem"; Hafta ekranı da onu böyle
 * kullanıyor.
 */
export function WeekGoalsScreen() {
  const toast = useToast();
  const { today, anchor, setAnchor } = usePlanlamaSurface("week");

  const goalsQuery = useWeekGoals(anchor);

  const createGoal = useCreateWeekGoal(toast.show);
  const updateGoal = useUpdateWeekGoal(toast.show);
  const stepGoal = useStepWeekGoal(toast.show);
  const toggleDone = useToggleWeekGoalDone(toast.show);
  const deleteGoal = useDeleteWeekGoal(toast.show);

  const [adding, setAdding] = useState(false);

  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);

  /*
   * Başlıktaki sayaç AÇIK hedefleri sayar. Hepsini saysaydı hafta
   * ilerledikçe rakam hiç azalmaz ve ilerleme hissi kaybolurdu
   * (GoalsScreen'deki sayaçla aynı gerekçe).
   */
  const openGoals = goals.filter((goal) => goal.completedAt === null).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PlanlamaHeader
        scale="week"
        anchor={anchor}
        today={today}
        openTotal={0}
        onAnchorChange={setAnchor}
      />

      <ScreenBody width="2xl">
        <SectionHeading
          sectionKey="planlama.weekGoals"
          onError={toast.show}
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
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        ) : (
          <>
            {goals.length === 0 ? (
              <p className="text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-3)]">
                Bu hafta için hedef yok. Pazartesi birkaç madde yazmak,
                haftanın sonunda neyi bitirdiğini görünür kılar.
              </p>
            ) : (
              /* `.goalList` uzun listede kendi içinde kayar (ölçü ve
                 gerekçe planlama.css'te); `tabIndex` verilmemesinin
                 gerekçesi GoalsScreen'de yazılı. */
              <ul className="goalList flex flex-col gap-2">
                {goals.map((goal) => (
                  <WeekGoalCard
                    key={goal.id}
                    goal={goal}
                    pending={updateGoal.isPending}
                    onUpdate={(draft) =>
                      updateGoal.mutate({
                        id: goal.id,
                        weekStart: anchor,
                        title: draft.title,
                        note: draft.note,
                        targetCount: draft.targetCount,
                        colorSlot: draft.colorSlot,
                        // Formda düzenlenmiyor; hedef sayısının
                        // GERÇEKTEN değişip değişmediğini anlamak ve
                        // sayacı kırpmak için gerekli (bkz.
                        // recountOnTargetChange).
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
                        weekStart: anchor,
                        doneCount,
                        targetCount: goal.targetCount,
                      })
                    }
                    onToggleDone={(done) =>
                      toggleDone.mutate({ id: goal.id, weekStart: anchor, done })
                    }
                    onDelete={() =>
                      deleteGoal.mutate({ id: goal.id, weekStart: anchor })
                    }
                  />
                ))}
              </ul>
            )}

            {adding ? (
              <div className="rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-3.5">
                <WeekGoalForm
                  weekStart={anchor}
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
              <div>
                <Button size="sm" onClick={() => setAdding(true)}>
                  Hedef ekle
                </Button>
              </div>
            )}
          </>
        )}
      </ScreenBody>

      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </div>
  );
}
