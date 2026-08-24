"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Görünüm modunun yaşadığı sorgu parametresi.
 *
 * ── Neden `ol` DEĞİL? ──
 * `useDayGridSurface` `ol`'u ÖLÇEK için kullanıyor (gün/hafta). Aynı
 * harfi burada farklı bir anlamda kullanmak, iki hook'un URL sözlüğünü
 * çakıştırırdı — ileride Bugün ızgarası Planlama'da gömülü çalışsaydı
 * iki parametre birbirini ezerdi. `gor` = görünüm.
 */
const MODE_PARAM = "gor";
const GRID_VALUE = "izgara";

export type PlanViewMode = "list" | "grid";

export interface PlanViewModeSurface {
  mode: PlanViewMode;
  setMode: (next: PlanViewMode) => void;
}

/**
 * Haftalık planlamanın Liste ⇄ Izgara anahtarı.
 *
 * ── Neden `usePlanlamaSurface`'a eklenmedi? ──
 * O hook Ay ve Hafta ekranlarının ORTAĞI ve Ay ölçeğinde ızgara modu
 * yok — bir aylık zaman ızgarası otuz sütun demektir ve okunmaz.
 * Oraya eklemek, Ay ekranına hiç kullanmadığı bir alan taşımak olurdu.
 *
 * ── Neden URL? ──
 * `usePlanlamaSurface`'ın gerekçesinin aynısı: paylaşılabilir, geri
 * tuşuyla uyumlu, yer imine eklenebilir ve sayfa yenilendiğinde
 * kaybolmaz. Aynı sözleşme: `replace` (mod değiştirmek bir gezinme
 * değil), `scroll: false` (sayfa başa sarmasın) ve VARSAYILANA eşitken
 * parametre SİLİNİR — temiz `/planlama/hafta` adresi listeyi gösterir.
 */
export function usePlanViewMode(): PlanViewModeSurface {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const mode: PlanViewMode =
    params.get(MODE_PARAM) === GRID_VALUE ? "grid" : "list";

  const setMode = useCallback(
    (next: PlanViewMode) => {
      const query = new URLSearchParams(params.toString());
      if (next === "grid") query.set(MODE_PARAM, GRID_VALUE);
      else query.delete(MODE_PARAM);

      const search = query.toString();
      router.replace(search.length > 0 ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    },
    [params, pathname, router],
  );

  return { mode, setMode };
}
