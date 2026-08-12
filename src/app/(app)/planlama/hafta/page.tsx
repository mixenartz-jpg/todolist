import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanlamaWeekScreen } from "@/features/planlama/PlanlamaWeekScreen";
import { PlanBoot } from "@/features/planlama/PlanBoot";

export const metadata: Metadata = { title: "Haftalık plan · Rutin" };

/* Gerekçe için bkz. ../ay/page.tsx. */
export default function Page() {
  return (
    <Suspense fallback={<PlanBoot scale="week" />}>
      <PlanlamaWeekScreen />
    </Suspense>
  );
}
