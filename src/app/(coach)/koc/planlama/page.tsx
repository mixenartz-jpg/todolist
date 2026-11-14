import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanlamaScreen } from "@/features/planlama/PlanlamaScreen";
import { PlanBoot } from "@/features/planlama/PlanBoot";

export const metadata: Metadata = { title: "Plan · Kero YKS" };

/*
 * Planlamanın takvim yüzeyi. Ay ve Hafta ARTIK AYRI ROTA DEĞİL —
 * ikisi de burada, `?ol=` ölçek parametresiyle.
 *
 * `<Suspense>` ZORUNLU: ekran çapayı ve ölçeği URL'den okuyor
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
      <PlanlamaScreen />
    </Suspense>
  );
}
