import type { Metadata } from "next";
import { Suspense } from "react";
import { TopicsScreen } from "@/features/topics/TopicsScreen";

export const metadata: Metadata = { title: "Konular · Kero YKS" };

/* `<Suspense>`: ekran ders/konu seçimini URL'den okuyor (useSearchParams). */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <TopicsScreen />
    </Suspense>
  );
}
