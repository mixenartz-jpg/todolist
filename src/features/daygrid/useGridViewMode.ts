"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Görünüm modunun yaşadığı sorgu parametresi.
 *
 * `usePlanViewMode` ile AYNI harf (`gor` = görünüm) bilinçli: iki ekran
 * aynı anda render edilmiyor ve kullanıcı açısından ikisi de "bu sayfayı
 * nasıl göstereyim" sorusunun cevabı. Farklı harfler seçmek, aynı ayarı
 * iki ayrı sözcükle anlatmak olurdu.
 *
 * `ol` DEĞİL: onu `useDayGridSurface` ÖLÇEK için kullanıyor (gün/hafta)
 * ve ikisi aynı ekranda yan yana duruyor — aynı harfi paylaşsalardı
 * biri diğerini ezerdi.
 */
const MODE_PARAM = "gor";
const LIST_VALUE = "liste";

export type GridViewMode = "grid" | "list";

export interface GridViewModeSurface {
  mode: GridViewMode;
  setMode: (next: GridViewMode) => void;
}

/**
 * Bugün ekranının Izgara ⇄ Liste anahtarı.
 *
 * ── Neden `usePlanViewMode`'u yeniden kullanmıyoruz? ──
 * Varsayılanları TERS. Planlama'da liste varsayılan ve URL'e `izgara`
 * yazılır; burada ızgara varsayılan ve URL'e `liste` yazılır. Ortak bir
 * hook, varsayılanı parametre olarak almak zorunda kalırdı — ve o
 * parametreyi çağrı yerinde yanlış vermek, sayfanın sessizce başka bir
 * modda açılmasına yol açardı. İki küçük hook, bir esnek hooktan daha
 * az kırılgan.
 *
 * Bugün ekranının varsayılanı ızgara çünkü mevcut davranış o: bu iş bir
 * seçenek ekliyor, kimsenin alışkanlığını değiştirmiyor.
 *
 * ── Neden URL, `localStorage` değil? ──
 * Bu projede hiçbir görünüm tercihi tarayıcı deposunda tutulmuyor (bkz.
 * `useCollapsedDays`'in gerekçesi). URL ise paylaşılabilir, geri tuşuyla
 * uyumlu, yer imine eklenebilir ve sayfa yenilendiğinde kaybolmaz.
 *
 * Sözleşme `usePlanViewMode` ile birebir: `replace` (mod değiştirmek bir
 * gezinme değil, geçmişi kirletmemeli), `scroll: false` (sayfa başa
 * sarmasın) ve VARSAYILANA eşitken parametre SİLİNİR — temiz `/bugun`
 * adresi ızgarayı gösterir.
 */
export function useGridViewMode(): GridViewModeSurface {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const mode: GridViewMode =
    params.get(MODE_PARAM) === LIST_VALUE ? "list" : "grid";

  const setMode = useCallback(
    (next: GridViewMode) => {
      const query = new URLSearchParams(params.toString());
      if (next === "list") query.set(MODE_PARAM, LIST_VALUE);
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
