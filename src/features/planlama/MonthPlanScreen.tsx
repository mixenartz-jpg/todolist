"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { ScreenBody } from "@/components/Screen";
import { Toast, useToast } from "@/components/Toast";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { MonthPlanCard } from "./MonthPlanCard";
import { MonthPlanForm } from "./MonthPlanForm";
import {
  useCreateMonthPlan,
  useDeleteMonthPlan,
  useUpdateMonthPlan,
} from "./mutations";
import { PlanlamaHeader } from "./PlanlamaHeader";
import { useMonthPlans } from "./queries";
import { usePlanlamaSurface } from "./usePlanlamaSurface";
import "./planlama.css";

/**
 * Genel planlama — ayın not kartları.
 *
 * ── Neden Hedefler'in altında değil, ayrı bir sekme? ──
 * İkisi aynı ayı okur ama farklı şeyler tutar: hedef ÖLÇÜLEN bir iştir
 * (sayaç, ilerleme, bağlı görevler), not ölçülmeyen bir bağlamdır ("bu
 * ay sınav haftası var"). Aynı listede dursalardı, ilerleme çubuğu
 * olmayan kartlar eksik görünür ve kullanıcı her nota bir sayı vermeye
 * çalışırdı.
 *
 * ── Neden tek büyük metin değil? ──
 * İlk sürüm ay başına tek textarea'ydı. Kart başına satır, aramayı ve
 * tek bir maddeyi silmeyi mümkün kılıyor; tek dev metinde bir maddeyi
 * kaldırmak, metnin ortasından cümle kesmek oluyordu.
 *
 * Çapa Ay/Hafta/Hedefler ekranlarıyla PAYLAŞILIR (URL'deki `?ay=`):
 * Eylül'ün hedeflerine bakarken "Genel"e basan kullanıcı Eylül'ün
 * notlarını bulmalı, bugünün ayını değil.
 */
export function MonthPlanScreen() {
  const toast = useToast();
  const { today, anchor, setAnchor } = usePlanlamaSurface("month");

  const plansQuery = useMonthPlans(anchor);

  const createPlan = useCreateMonthPlan(toast.show);
  const updatePlan = useUpdateMonthPlan(toast.show);
  const deletePlan = useDeleteMonthPlan(toast.show);

  const [adding, setAdding] = useState(false);

  const plans = plansQuery.data ?? [];

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
          sectionKey="planlama.monthPlan"
          onError={toast.show}
          trailing={
            plans.length > 0 ? (
              <span className="tabular text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                {plans.length}
              </span>
            ) : undefined
          }
        />

        {plansQuery.isPending ? (
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
            {plans.length === 0 ? (
              <p className="text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-3)]">
                Bu ay için not yok. Hedeflerin ölçtüğü şeyler dışında
                kalan her şey buraya: sınav haftaları, denemek istediğin
                yöntemler, geçen aydan taşınanlar.
              </p>
            ) : (
              /*
               * `.goalList` yeniden KULLANILIYOR (Hedefler ile aynı
               * eşik ve aynı soluma): iki sekme aynı ölçekte, aynı
               * boyda kartlar gösteriyor ve birinde kayan listenin
               * ötekinde sayfayı uzatması tutarsızlık olurdu.
               */
              <ul className="goalList flex flex-col gap-2">
                {plans.map((plan) => (
                  <MonthPlanCard
                    key={plan.id}
                    plan={plan}
                    pending={updatePlan.isPending}
                    onUpdate={(draft) =>
                      updatePlan.mutate({
                        id: plan.id,
                        month: anchor,
                        title: draft.title,
                        body: draft.body,
                        colorSlot: draft.colorSlot,
                      })
                    }
                    onDelete={() =>
                      deletePlan.mutate({ id: plan.id, month: anchor })
                    }
                  />
                ))}
              </ul>
            )}

            {adding ? (
              <div className="rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-3.5">
                <MonthPlanForm
                  month={anchor}
                  sortOrder={plans.length}
                  pending={createPlan.isPending}
                  onSubmit={(draft) => {
                    createPlan.mutate(draft);
                    setAdding(false);
                  }}
                  onCancel={() => setAdding(false)}
                />
              </div>
            ) : (
              <div>
                <Button size="sm" onClick={() => setAdding(true)}>
                  Not ekle
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
