import type { Metadata } from "next";
import { Suspense } from "react";
import { TodayScreen, TodayBoot } from "@/features/today/TodayScreen";

export const metadata: Metadata = { title: "Bugün · Rutin" };

/*
 * `<Suspense>` ZORUNLU: ekran ölçeği ve çapayı URL'den okuyor
 * (useDayGridSurface → useSearchParams) ve sarmalanmadan bırakılırsa
 * Next derlemeyi durdurur. Planlama sayfalarındaki kuralın aynısı.
 *
 * Fallback boş kutu değil iskelet: parametreler çözülene kadar geçen
 * kare boyunca sayfa yüksekliği korunur ve içerik zıplamaz.
 */
export default function Page() {
  return (
    <Suspense fallback={<TodayBoot />}>
      <TodayScreen />
    </Suspense>
  );
}
