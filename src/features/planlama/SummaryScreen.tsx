"use client";

import Link from "next/link";
import { ScreenBody } from "@/components/Screen";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Toast, useToast } from "@/components/Toast";
import { formatPercent } from "@/lib/ui/tr";
import { formatDuration } from "@/features/tasks/schedule";
import { useTasks } from "@/features/tasks/queries";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { CategoryManager } from "./CategoryManager";
import { PlanlamaHeader } from "./PlanlamaHeader";
import { useCategories, usePlanGoals } from "./queries";
import { buildMonthRollup } from "./rollup";
import { usePlanlamaSurface } from "./usePlanlamaSurface";
import "./planlama.css";

/**
 * Ay özeti — ay sonu okuması.
 *
 * ── Neden ızgaranın yanında değil, ayrı sekme? ──
 * Bu bir DEĞERLENDİRME yüzeyi; plan kurarken görünmesi gürültüdür.
 * Hesabı (`buildMonthRollup`) ızgarayla hiçbir şey paylaşmaz.
 *
 * Kategori yönetimi de burada: kategorilere karar vermek ("bu hiç
 * kullanılmamış, kaldırayım") tam olarak dağılıma bakarken verilen bir
 * karardır. Beşinci bir sekme ona hedeflerle eşit ağırlık verirdi.
 */
export function SummaryScreen() {
  const toast = useToast();
  const { today, anchor, setAnchor } = usePlanlamaSurface();

  const tasksQuery = useTasks();
  const goalsQuery = usePlanGoals(anchor);
  const categoriesQuery = useCategories();


  const [managing, setManaging] = useState(false);

  const rollup = useMemo(
    () =>
      buildMonthRollup(
        tasksQuery.data ?? [],
        goalsQuery.data ?? [],
        categoriesQuery.data ?? [],
        anchor,
        today,
      ),
    [tasksQuery.data, goalsQuery.data, categoriesQuery.data, anchor, today],
  );

  const loading = tasksQuery.isPending || goalsQuery.isPending;

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
        {loading ? (
          <div className="flex flex-col gap-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        ) : rollup.taskTotal === 0 && rollup.goals.length === 0 ? (
          <p className="text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-3)]">
            Bu ay için henüz veri yok. Görev ekledikçe ve hedef
            yazdıkça özet burada birikir.
          </p>
        ) : (
          <>
            <section>
              <SectionHeading
                sectionKey="planlama.summary"
                onError={toast.show}
              />

              <div className="summaryGrid">
                <StatTile
                  label="Tamamlanan"
                  value={`${rollup.taskDone}/${rollup.taskTotal}`}
                  hint={
                    rollup.completionRatio === null
                      ? undefined
                      : formatPercent(rollup.completionRatio)
                  }
                />
                <StatTile
                  label="Dolu gün"
                  value={String(rollup.activeDays)}
                  /* Payda "sayılan gün": gelecek günler dahil değil,
                     çünkü onlar henüz boş sayılamaz (bkz. rollup.ts). */
                  hint={`${rollup.countedDays} günde`}
                />
                <StatTile
                  label="Boş gün"
                  value={String(rollup.emptyDays)}
                />
                <StatTile
                  label="Planlanan süre"
                  value={
                    rollup.totalMinutes > 0
                      ? formatDuration(rollup.totalMinutes)
                      : "—"
                  }
                  hint={rollup.totalMinutes > 0 ? "saatli işler" : undefined}
                />
              </div>
            </section>

            {rollup.goals.length > 0 && (
              <section>
                <SectionHeading
                  sectionKey="planlama.goals"
                  onError={toast.show}
                />

                {/*
                  Hedefler burada YALNIZCA ÖZETLENİR, düzenlenmez.

                  Önce tam `GoalCard` listesi vardı: aynı kart, aynı
                  düzenle/±1/arşivle/sil yetkileriyle Hedefler ekranının
                  birebir kopyası. Aynı hedefi iki sekmede aynı şekilde
                  düzenlemek "hangisi asıl" sorusunu doğuruyordu ve iki
                  yerde tutulan bir arayüz zamanla ayrışırdı.

                  Özet GERİYE BAKMA ekranıdır: ne kadarı oldu. Değiştirme
                  işi Hedefler'e ait ve oraya bir tık uzakta.
                */}
                <ul className="flex flex-col gap-1.5">
                  {rollup.goals.map((progress) => (
                    <li
                      key={progress.goal.id}
                      className="flex items-baseline justify-between gap-3 rounded-lg bg-[var(--color-surface)] px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                        {progress.goal.title}
                      </span>

                      <span className="tabular shrink-0 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                        {progress.ratio === null
                          ? "ölçülmüyor"
                          : formatPercent(progress.ratio)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-2">
                  <Link
                    href="/planlama/hedefler"
                    className="text-[length:var(--text-sm)] text-[var(--color-accent)] hover:underline"
                  >
                    Hedefleri düzenle
                  </Link>
                </div>
              </section>
            )}


            <section>
              <SectionHeading
                sectionKey="planlama.categories"
                onError={toast.show}
                trailing={
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-expanded={managing}
                    onClick={() => setManaging((open) => !open)}
                  >
                    {managing ? "Kapat" : "Düzenle"}
                  </Button>
                }
              />

              <CategoryBreakdown slices={rollup.categories} />

              {managing && (
                <div className="mt-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3.5">
                  <CategoryManager
                    categories={categoriesQuery.data ?? []}
                    onError={toast.show}
                  />
                </div>
              )}
            </section>
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

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-3">
      <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        {label}
      </p>
      <p className="tabular mt-1 text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
          {hint}
        </p>
      )}
    </div>
  );
}
