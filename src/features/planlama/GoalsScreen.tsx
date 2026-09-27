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
import { goalMeasure } from "./goalmeasure";
import { useGoalNodesFor } from "./nodeQueries";
import { PlanlamaHeader } from "./PlanlamaHeader";
import { monthOfWeek } from "./range";
import { toParts } from "@/lib/date/date";
import { formatMonthYear } from "@/lib/ui/tr";
import { usePlanGoals } from "./queries";
import { daysSinceGoalTask } from "./pace";
import { goalProgress } from "./rollup";
import { usePlanlamaSurface } from "./usePlanlamaSurface";
import { WeekGoalsSection } from "./WeekGoalsSection";
import { PeriodNoteEditor } from "./PeriodNoteEditor";
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
 * Çapa Plan yüzeyiyle PAYLAŞILIR (URL'deki `?t=`): Eylül'ün
 * ızgarasına bakarken "Hedefler"e basan kullanıcı Eylül'ün hedeflerini
 * bulmalı, bugünün ayını değil.
 *
 * ── Haftalık hedefler neden BURADA? ──
 * Ayrı bir "Haftalık" sekmesiydi ve aylık hedeflerden habersiz bir
 * liste çiziyordu. 0014'ün `plan_goal_id` bağı (haftalık hedef = aylık
 * hedefin dilimi) yalnızca haftalıktan aya doğru okunuyordu; aylık
 * hedefe bakan kullanıcı dilimlerini göremiyordu. Aynı ekranda bağ iki
 * yönlü oldu ve sekme çubuğu bir sekme eksildi.
 */
export function GoalsScreen() {
  const toast = useToast();
  /*
   * `today` yüzeyden geliyor: ekran geçmiş bir aya bakıyor olabilir
   * ama "yolunda mıyım" sorusu her zaman BUGÜNE göre cevaplanır —
   * geçmiş bir ayın hedefinde `goalPace` beklenen oranı 1'e kırpıyor.
   */
  /*
   * Ekran HAFTADAN HAFTAYA geziniyor: kullanıcının asıl planlama
   * birimi hafta ve ay oklarıyla yalnızca ayın bir haftasına
   * (bugününkine ya da ilkine) ulaşılabiliyordu — öbür haftalara
   * hedef koymak imkânsızdı.
   *
   * Aylık hedefler o haftanın AYINI gösterir (`monthOfWeek`). `anchor`
   * yine ayın 1'i: `usePlanGoals` onu bekliyor ve hedefler `month`
   * sütunuyla yazılıyor.
   */
  const { today, weekAnchor: weekStart, setWeekAnchor } = usePlanlamaSurface();
  const anchor = useMemo(() => monthOfWeek(weekStart, today), [weekStart, today]);

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
   * Ayın TÜM hedeflerinin ağaçları, TEK sorguda.
   *
   * Her kartın yüzdesi ağaç varsa ondan okunuyor (goalmeasure.ts) ve
   * kart başına ayrı sorgu, on hedefli bir ayda on ağ turu demekti.
   */
  const goalIds = useMemo(() => goals.map((g) => g.id), [goals]);
  const nodesQuery = useGoalNodesFor(goalIds);

  /** Hedef kimliğinden ağaç ölçüsüne; ağacı olmayan hedef listede YOK. */
  const treeMeasures = useMemo(() => {
    const nodes = nodesQuery.data ?? [];
    if (nodes.length === 0) return new Map<string, ReturnType<typeof goalMeasure>>();

    const out = new Map<string, ReturnType<typeof goalMeasure>>();
    for (const goal of goals) {
      const measure = goalMeasure(goal, nodes, tasksQuery.data ?? []);
      if (measure.kind === "tree") out.set(goal.id, measure);
    }
    return out;
  }, [goals, nodesQuery.data, tasksQuery.data]);

  /*
   * Başlıktaki sayaç AÇIK hedefleri sayar (arşivlenmemiş ve
   * tamamlanmamış). Hepsini saysaydı ay ilerledikçe rakam hiç azalmaz
   * ve ilerleme hissi kaybolurdu — CategoryFilterBar rozetleriyle aynı
   * gerekçe.
   */
  const openGoals = progresses.filter((p) => {
    if (p.goal.archivedAt !== null) return false;
    // Ağaç varsa sayaç da ondan okunmalı, yoksa başlıktaki rakam
    // kartlardaki yüzdelerle çelişirdi.
    const measure = treeMeasures.get(p.goal.id);
    const ratio = measure && measure.kind === "tree" ? measure.ratio : p.ratio;
    return ratio === null || ratio < 1;
  }).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PlanlamaHeader
        scale="week"
        anchor={weekStart}
        today={today}
        openTotal={0}
        onAnchorChange={setWeekAnchor}
      />

      <ScreenBody width="2xl">
        {/*
          Haftalık hedefler EN ÜSTTE: kullanıcının asıl planlama birimi
          hafta; aylık hedefler haftaların hizmet ettiği genel yön.
          İlk bölüm olduğu için kendi üst boşluğu kapalı (`first`).
        */}
        <WeekGoalsSection
          weekStart={weekStart}
          monthGoals={goals}
          tasks={tasksQuery.data ?? []}
          onError={toast.show}
          onNotice={(text) => toast.show(text, "success")}
          first
        />

        <div className="mt-[var(--stack-gap)]">
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
        </div>

        <PeriodNoteEditor
          // Ay değişince baştan yüklensin: eski ayın metni yeni ayın
          // verisi gelene kadar görünmesin.
          key={anchor}
          scale="month"
          periodStart={anchor}
          // Başlık haftayı gösteriyor; hangi ayın hedeflerine bakıldığı
          // burada yazmalı.
          label={`Ayın amacı · ${formatMonthYear(toParts(anchor).year, toParts(anchor).month)}`}
          onError={toast.show}
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
              <ul className="goalList">
                {progresses.map((progress) => (
                  <GoalCard
                    key={progress.goal.id}
                    progress={progress}
                    today={today}
                    daysIdle={daysSinceGoalTask(progress, tasksQuery.data ?? [], today)}
                    treeMeasure={(() => {
                      const m = treeMeasures.get(progress.goal.id);
                      return m && m.kind === "tree" ? m : undefined;
                    })()}
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
