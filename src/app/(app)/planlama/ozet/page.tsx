import type { Metadata } from "next";
import { Suspense } from "react";
import { SummaryScreen } from "@/features/planlama/SummaryScreen";

export const metadata: Metadata = { title: "Ay özeti · Rutin" };

/* `<Suspense>` gerekçesi için bkz. ../ay/page.tsx. */
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-0 flex-1" aria-hidden />}>
      <SummaryScreen />
    </Suspense>
  );
}
