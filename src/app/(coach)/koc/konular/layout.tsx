import { Suspense, type ReactNode } from "react";
import { PlanlamaTabs } from "../planlama/PlanlamaTabs";

/**
 * Konular, Planlama'nın sekme çubuğunda durur (ana menüde beş sekme
 * sınırı var) — aynı kabuk, aynı sekmeler.
 */
export default function KonularLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--color-line)] px-4 pt-3 md:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <Suspense fallback={<div className="h-9" aria-hidden />}>
            <PlanlamaTabs />
          </Suspense>
        </div>
      </div>
      {children}
    </div>
  );
}
