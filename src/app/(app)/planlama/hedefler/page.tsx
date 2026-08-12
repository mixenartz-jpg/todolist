import type { Metadata } from "next";
import { Suspense } from "react";
import { GoalsScreen } from "@/features/planlama/GoalsScreen";

export const metadata: Metadata = { title: "Hedefler · Rutin" };

/* `<Suspense>` gerekçesi için bkz. ../ay/page.tsx. */
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-0 flex-1" aria-hidden />}>
      <GoalsScreen />
    </Suspense>
  );
}
