import type { Metadata } from "next";
import { Suspense } from "react";
import { WeekGoalsScreen } from "@/features/planlama/WeekGoalsScreen";

export const metadata: Metadata = { title: "Haftalık hedefler · Rutin" };

/* `<Suspense>` gerekçesi için bkz. ../ay/page.tsx. */
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-0 flex-1" aria-hidden />}>
      <WeekGoalsScreen />
    </Suspense>
  );
}
