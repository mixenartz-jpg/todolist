import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanlamaMonthScreen } from "@/features/planlama/PlanlamaMonthScreen";
import { PlanBoot } from "@/features/planlama/PlanBoot";

export const metadata: Metadata = { title: "Aylık plan · Rutin" };

/*
 * `<Suspense>` ZORUNLU: ekran çapayı URL'den okuyor
 * (usePlanlamaSurface → useSearchParams) ve sarmalanmadan bırakılırsa
 * Next derlemeyi durdurur. Layout'taki sarmalayıcı YETMEZ — o yalnızca
 * sekme çubuğunu kapsıyor, `children` onun dışında kalıyor.
 *
 * Fallback ızgara iskeletidir, boş bir kutu değil: sorgu parametreleri
 * çözülene kadar geçen kare boyunca sayfa yüksekliği korunur ve
 * içerik zıplamaz.
 */
export default function Page() {
  return (
    <Suspense fallback={<PlanBoot scale="month" />}>
      <PlanlamaMonthScreen />
    </Suspense>
  );
}
