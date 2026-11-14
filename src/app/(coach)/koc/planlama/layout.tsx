import { Suspense, type ReactNode } from "react";
import { PlanlamaTabs } from "./PlanlamaTabs";

/**
 * Planlama kabuğu: alt sekmeler + seçili görünüm.
 *
 * Takvim kabuğuyla aynı düzen: sekme çubuğu görünümlerin KENDİ
 * başlıklarının üstünde durur ve her görünüm kendi ay/hafta başlığını
 * ve gezinme düğmelerini korur.
 *
 * `<Suspense>` ZORUNLU: `PlanlamaTabs` sorgu dizesini taşımak için
 * `useSearchParams` kullanıyor ve sarmalanmadan bırakılırsa Next tüm
 * rotayı istemci tarafı render'a düşürür. Fallback sekme çubuğunun
 * yüksekliğini birebir tutar (py-1 + py-1.5 + satır yüksekliği), yoksa
 * içerik ilk karede yukarı zıplardı.
 */
export default function PlanlamaLayout({ children }: { children: ReactNode }) {
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
