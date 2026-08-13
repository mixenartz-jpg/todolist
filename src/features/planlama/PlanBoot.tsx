import { Screen, ScreenHeader, ScreenBody } from "@/components/Screen";
import type { PlanScale } from "./range";
import { PlanSkeleton } from "./PlanSkeleton";

/**
 * Ekran açılırken gösterilen iskelet.
 *
 * `PlanSkeleton`'dan farkı başlık şeridini de çizmesidir: bu bileşen
 * sorgu parametreleri çözülmeden ÖNCE, yani başlığın kendisi henüz
 * hesaplanamazken kullanılır (Suspense fallback'i). `PlanSkeleton` ise
 * ekran kurulduktan sonra yalnızca görevler beklenirken ızgaranın
 * yerini tutar — o an başlık zaten çizilmiştir.
 *
 * Sunucu bileşeni: hiçbir durum ya da olay taşımıyor.
 */
export function PlanBoot({ scale }: { scale: PlanScale }) {
  return (
    <Screen>
      {/* Başlığın yüksekliğini tutan boş şerit — yazı yok, çünkü hangi
          ay/hafta olduğu henüz bilinmiyor ve yanlış bir metin
          göstermektense yer tutmak doğru. */}
      <ScreenHeader
        width="6xl"
        title={
          <span
            className="block h-7 w-40 animate-pulse rounded-md bg-[var(--color-surface-2)]"
            aria-hidden
          />
        }
      />

      <ScreenBody width="6xl">
        <PlanSkeleton scale={scale} />
      </ScreenBody>
    </Screen>
  );
}
