"use client";

import { ScreenBody } from "@/components/Screen";
import { Toast, useToast } from "@/components/Toast";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { MonthPlanEditor } from "./MonthPlanEditor";
import { PlanlamaHeader } from "./PlanlamaHeader";
import { usePlanlamaSurface } from "./usePlanlamaSurface";

/**
 * Genel planlama — ayın serbest metni.
 *
 * ── Neden Hedefler'in altında değil, ayrı bir sekme? ──
 * İkisi aynı ayı okur ama farklı işlerdir: hedef yazmak kalem kalem
 * karar vermek, genel planlama düşünmektir. Aynı ekranda alt alta
 * dursalardı, hedef listesi uzadıkça metin alanı ekranın dışına
 * itilir ve pratikte hiç kullanılmazdı — üstelik Hedefler'e artık iç
 * kaydırma geldiği için sayfa iki ayrı kaydırma bağlamı taşırdı.
 *
 * Çapa Ay/Hafta/Hedefler ekranlarıyla PAYLAŞILIR (URL'deki `?ay=`):
 * Eylül'ün hedeflerine bakarken "Genel"e basan kullanıcı Eylül'ün
 * notunu bulmalı, bugünün ayını değil (GoalsScreen ile aynı gerekçe).
 */
export function MonthPlanScreen() {
  const toast = useToast();
  const { today, anchor, setAnchor } = usePlanlamaSurface("month");

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
        <SectionHeading sectionKey="planlama.monthPlan" onError={toast.show} />

        <MonthPlanEditor month={anchor} onError={toast.show} />
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
