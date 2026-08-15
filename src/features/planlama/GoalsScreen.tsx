"use client";
import { ScreenBody } from "@/components/Screen";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Toast, useToast } from "@/components/Toast";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { useTasks } from "@/features/tasks/queries";
import { GoalCard } from "./GoalCard";
import { GoalForm } from "./GoalForm";
import {
  useArchiveGoal,
  useCreateGoal,
  useDeleteGoal,
  useStepGoalProgress,
  useUpdateGoal,
} from "./mutations";
import { PlanlamaHeader } from "./PlanlamaHeader";
import { usePlanGoals } from "./queries";
import { goalProgress } from "./rollup";
import { usePlanlamaSurface } from "./usePlanlamaSurface";
import "./planlama.css";

/**
 * Aylık hedefler.
 *
 * ── Neden ızgaranın yanında değil, ayrı bir sekme? ──
 * Hedef yazmak ay BAŞINDA yapılan, ızgaradan bağımsız bir iştir.
 * Havuz gibi ızgaranın yanına sıkıştırmak masaüstünde üçüncü bir
 * sütun demekti; 1024px'de havuz (16rem) + ızgara + hedefler
 * hiçbirine yer bırakmazdı.
 *
 * Çapa Ay/Hafta ekranlarıyla PAYLAŞILIR (URL'deki `?ay=`): Eylül'ün
 * ızgarasına bakarken "Hedefler"e basan kullanıcı Eylül'ün hedeflerini
 * bulmalı, bugünün ayını değil.
 */
export function GoalsScreen() {
  const toast = useToast();
  const { today, anchor, setAnchor } = usePlanlamaSurface("month");

  const goalsQuery = usePlanGoals(anchor);
  const tasksQuery = useTasks();

  const createGoal = useCreateGoal(toast.show);
  const updateGoal = useUpdateGoal(toast.show);
  const stepProgress = useStepGoalProgress(toast.show);
  const archiveGoal = useArchiveGoal(toast.show);
  const deleteGoal = useDeleteGoal(toast.show);

  const [adding, setAdding] = useState(false);

  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);

  const progresses = useMemo(
    () => goals.map((goal) => goalProgress(goal, tasksQuery.data ?? [])),
    [goals, tasksQuery.data],
  );

  /*
   * Başlıktaki sayaç AÇIK hedefleri sayar (arşivlenmemiş ve
   * tamamlanmamış). Hepsini saysaydı ay ilerledikçe rakam hiç azalmaz
   * ve ilerleme hissi kaybolurdu — CategoryFilterBar rozetleriyle aynı
   * gerekçe.
   */
  const openGoals = progresses.filter(
    (p) => p.goal.archivedAt === null && (p.ratio === null || p.ratio < 1),
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PlanlamaHeader
        scale="month"
        anchor={anchor}
        today={today}
        openTotal={0}
        onAnchorChange={setAnchor}
      />

      <ScreenBody width="2xl">
        <SectionHeading
          sectionKey="planlama.goals"
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
                className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        ) : (
          <>
            {progresses.length === 0 ? (
              <p className="text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-3)]">
                Bu ay için hedef yok. Ayın başında birkaç odak yazmak,
                günlük işlerin neye hizmet ettiğini görünür kılar.
              </p>
            ) : (
              /*
               * `.goalList` uzun listede kendi içinde kayar (ölçü ve
               * gerekçe planlama.css'te).
               *
               * `tabIndex={0}` YOK — bilerek. Kaydırılabilir bir bölge
               * normalde klavyeyle de kaydırılabilmelidir, ama buradaki
               * her kart zaten odaklanabilir düğmeler içeriyor (başlık,
               * ±1, Arşivle, Sil) ve Tab ile ilerleyen kullanıcıyı
               * tarayıcı görünür alana kendisi kaydırıyor. Listeye ayrıca
               * odak vermek, ekran okuyucu kullanıcısına hiçbir şey
               * söylemeyen boş bir durak eklemekten ibaret olurdu.
               */
              <ul className="goalList flex flex-col gap-2">
                {progresses.map((progress) => (
                  <GoalCard
                    key={progress.goal.id}
                    progress={progress}
                    pending={updateGoal.isPending}
                    onUpdate={(draft) =>
                      updateGoal.mutate({
                        id: progress.goal.id,
                        month: anchor,
                        title: draft.title,
                        note: draft.note,
                        targetCount: draft.targetCount,
                        colorSlot: draft.colorSlot,
                      })
                    }
                    onStep={(doneCount) =>
                      stepProgress.mutate({
                        id: progress.goal.id,
                        month: anchor,
                        doneCount,
                      })
                    }
                    onArchive={(archived) =>
                      archiveGoal.mutate({
                        id: progress.goal.id,
                        month: anchor,
                        archived,
                      })
                    }
                    onDelete={() =>
                      deleteGoal.mutate({ id: progress.goal.id, month: anchor })
                    }
                  />
                ))}
              </ul>
            )}

            {adding ? (
              <div className="rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-3.5">
                <GoalForm
                  month={anchor}
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
