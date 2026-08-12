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
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[var(--color-line)] px-4 py-3 md:px-5">
        {/* Başlığın yüksekliğini tutan boş şerit — yazı yok, çünkü
            hangi ay/hafta olduğu henüz bilinmiyor ve yanlış bir metin
            göstermektense yer tutmak doğru. */}
        <div
          className="h-7 w-40 animate-pulse rounded-md bg-[var(--color-surface-2)]"
          aria-hidden
        />
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        <PlanSkeleton scale={scale} />
      </div>
    </div>
  );
}
