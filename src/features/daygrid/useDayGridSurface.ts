"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addDays, isDateStr, startOfIsoWeek, todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";

/** Çapanın yaşadığı sorgu parametresi. */
const ANCHOR_PARAM = "g";
/** Ölçeğin yaşadığı sorgu parametresi. */
const SCALE_PARAM = "ol";
const WEEK_VALUE = "hafta";

/** Mobilde hafta kaç gün gösterir — bkz. `useWideViewport`. */
const NARROW_WEEK_DAYS = 3;
const WIDE_WEEK_DAYS = 7;

export type GridScale = "day" | "week";

export interface DayGridSurface {
  today: DateStr;
  scale: GridScale;
  /** Gösterilen aralığın ilk günü. Hafta ölçeğinde Pazartesi'ye hizalı. */
  anchor: DateStr;
  /** Çizilecek sütunlar. Gün: 1 · Hafta: 7 (dar ekranda 3). */
  dates: DateStr[];
  /** Bugünü içeriyor mu? "Bugün" düğmesinin görünürlüğü buna bağlı. */
  isCurrent: boolean;
  setScale: (next: GridScale) => void;
  step: (delta: -1 | 1) => void;
  goToday: () => void;
}

/**
 * Izgaranın gezinme durumu: ölçek ve çapa.
 *
 * `usePlanlamaSurface` ile aynı sözleşme — URL'de yaşar, `replace` ile
 * yazılır, varsayılana eşitken parametre SİLİNİR. Fark: orada ölçek
 * ayrı bir rota, burada aynı sayfada bir parametre; Bugün ekranının
 * altındaki rutinler ve notlar her iki ölçekte de aynı yerde duruyor,
 * ikinci bir rota onları iki kez kurmak olurdu.
 *
 * URL olmasının kazancı orada anlatıldığı gibi: paylaşılabilir, geri
 * tuşuyla uyumlu, yer imine eklenebilir. `replace` çünkü günü
 * ilerletmek bir gezinme değil aynı ekranın ayarı — `push` olsaydı bir
 * haftayı gün gün gezen kullanıcının geri tuşu onu yedi kez geri
 * sürüklerdi.
 */
export function useDayGridSurface(): DayGridSurface {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const today = useMemo(() => todayStr(), []);
  const wide = useWideViewport();

  const scale: GridScale = params.get(SCALE_PARAM) === WEEK_VALUE ? "week" : "day";

  const rawAnchor = params.get(ANCHOR_PARAM);

  /*
   * URL'den gelen değer doğrulanır ve ölçeğe göre hizalanır. Adres
   * çubuğuna `?g=çorba` yazılabilir; guard'ı geçmeyen her şey bugüne
   * düşer. Hafta ölçeğinde çapa Pazartesi olmak ZORUNDA, yoksa
   * sütunlar hafta ortasından başlar.
   */
  const anchor = useMemo(() => {
    const base = rawAnchor !== null && isDateStr(rawAnchor) ? rawAnchor : today;
    return scale === "week" ? startOfIsoWeek(base) : base;
  }, [rawAnchor, scale, today]);

  const columnCount =
    scale === "day" ? 1 : wide ? WIDE_WEEK_DAYS : NARROW_WEEK_DAYS;

  const dates = useMemo(
    () => Array.from({ length: columnCount }, (_, i) => addDays(anchor, i)),
    [anchor, columnCount],
  );

  const isCurrent = dates.includes(today);

  const setParam = useCallback(
    (entries: Array<[string, string | null]>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of entries) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }

      const query = next.toString();
      router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [params, pathname, router],
  );

  /** Çapa varsayılana eşitse parametre yazılmaz — temiz `/bugun`. */
  const anchorValue = useCallback(
    (next: DateStr, forScale: GridScale): string | null => {
      const current = forScale === "week" ? startOfIsoWeek(today) : today;
      return next === current ? null : next;
    },
    [today],
  );

  const setScale = useCallback(
    (next: GridScale) => {
      if (next === scale) return;

      /*
       * Ölçek değişiminde ÇAPA KORUNUR: 20 Mart'a bakıp "Hafta" diyen
       * kullanıcı 20 Mart'ı içeren haftayı görmeli.
       *
       * Hafta→Gün ters yönde bir seçim gerektirir, çünkü hafta yedi
       * günün hangisine ineceğini söylemiyor. O hafta bugünü içeriyorsa
       * bugüne inilir; içermiyorsa Pazartesi'ye. Haftanın ortasına
       * bakarken "Gün" deyip alakasız bir güne düşmek kafa karıştırır.
       */
      const nextAnchor =
        next === "week"
          ? startOfIsoWeek(anchor)
          : dates.includes(today)
            ? today
            : anchor;

      setParam([
        [SCALE_PARAM, next === "week" ? WEEK_VALUE : null],
        [ANCHOR_PARAM, anchorValue(nextAnchor, next)],
      ]);
    },
    [scale, anchor, dates, today, setParam, anchorValue],
  );

  /**
   * Bir adım ileri/geri.
   *
   * Adım GÖRÜNEN sütun sayısı kadar: dar ekranda hafta 3 gün
   * gösteriyorsa ok da 3 gün atlar. 7 atlasaydı görülmeyen dört gün
   * sessizce arada kalır ve kullanıcı işlerini kaybederdi.
   */
  const step = useCallback(
    (delta: -1 | 1) => {
      const next = addDays(anchor, delta * columnCount);
      setParam([[ANCHOR_PARAM, anchorValue(next, scale)]]);
    },
    [anchor, columnCount, scale, setParam, anchorValue],
  );

  const goToday = useCallback(() => {
    setParam([[ANCHOR_PARAM, null]]);
  }, [setParam]);

  return { today, scale, anchor, dates, isCurrent, setScale, step, goToday };
}

const WIDE_QUERY = "(min-width: 768px)";

/**
 * 768px üstünde miyiz?
 *
 * Saf CSS yetmez: sütun SAYISI `dates` dizisinin uzunluğunu belirliyor
 * ve o dizi sürükleme hit-test'ine ve ok adımına giriyor. CSS ile
 * gizlenen bir sütun JS için hâlâ oradadır ve bloklar yanlış güne
 * düşerdi.
 *
 * Sunucu anlık görüntüsü `false`: mobil varsayılan. Sunucuda viewport
 * bilinemez ve `true` dönmek geniş ekranda bile ilk boyamada yedi sütun
 * çizip hydration uyuşmazlığı riski alırdı.
 */
function useWideViewport(): boolean {
  return useSyncExternalStore(subscribeToWide, getWideSnapshot, () => false);
}

function subscribeToWide(onChange: () => void): () => void {
  const mql = window.matchMedia(WIDE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getWideSnapshot(): boolean {
  return window.matchMedia(WIDE_QUERY).matches;
}
