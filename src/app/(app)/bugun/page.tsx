import type { Metadata } from "next";
import { TodayScreen } from "@/features/today/TodayScreen";

export const metadata: Metadata = { title: "Bugün · Kero YKS" };

/*
 * `<Suspense>` ARTIK YOK.
 *
 * Gerekçesi ekranın ölçeği ve çapayı URL'den okumasıydı
 * (`useDayGridSurface` → `useSearchParams`); sarmalanmadan bırakılırsa
 * Next derlemeyi durduruyordu. Saat ızgarası kalkınca ekran tek bir
 * günü — bugünü — gösteriyor ve hiçbir arama parametresi okumuyor.
 *
 * Sınır boşuna durmuyordu ama artık boşuna dururdu ve `TodayBoot`
 * iskeleti hiçbir zaman çizilmeyecek bir kareyi bekliyor olurdu — o da
 * bu yüzden silindi. Veri beklemesi zaten ekranın KENDİ içinde
 * karşılanıyor (`routinesQuery.isPending` → `TodaySkeleton`).
 */
export default function Page() {
  return <TodayScreen />;
}
