import type { Metadata } from "next";
import { Suspense } from "react";
import { MonthPlanScreen } from "@/features/planlama/MonthPlanScreen";

export const metadata: Metadata = { title: "Genel planlama · Rutin" };

/* `<Suspense>` gerekçesi için bkz. ../ay/page.tsx. */
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-0 flex-1" aria-hidden />}>
      <MonthPlanScreen />
    </Suspense>
  );
}
