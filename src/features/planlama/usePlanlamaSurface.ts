"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isDateStr, startOfIsoWeek, startOfMonth, todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { PlanScale } from "./range";
import type { CategoryFilter } from "./types";

/** Çapanın yaşadığı sorgu parametresi. */
const ANCHOR_PARAM = "ay";
/** Kategori filtresinin yaşadığı sorgu parametresi. */
const CATEGORY_PARAM = "kat";
/** "Kategorisi olmayanları göster" filtresinin URL'deki karşılığı. */
const NO_CATEGORY = "yok";

export interface PlanlamaSurface {
  /** Bugün — tek yerde hesaplanır, alt ekranlar aynı günü görür. */
  today: DateStr;
  /** Görüntülenen aralığın ilk günü (haftanın Pazartesi'si / ayın 1'i). */
  anchor: DateStr;
  category: CategoryFilter;
  setAnchor: (next: DateStr) => void;
  setCategory: (next: CategoryFilter) => void;
}

/**
 * Ay ve Hafta ekranlarının paylaştığı durum: çapa ve kategori filtresi.
 *
 * ── Neden URL, React state DEĞİL? ──
 * Ay ve Hafta ayrı ROTALAR (bkz. PlanlamaTabs). Rota değişince React
 * state zaten kaybolur; "Eylül'e bakıyordum, Hafta dedim, Ağustos'a
 * döndüm" kabul edilemez. Context'e taşımak layout'a bir provider ve
 * "use client" getirirdi. URL ise ücretsiz: paylaşılabilir, geri
 * tuşuyla uyumlu ve yer imine eklenebilir — "Ağustos planım" sayfası
 * gerçekten bir sayfa olur.
 *
 * ── Neden `replace`, `push` DEĞİL? ──
 * Ay ilerletmek bir GEZİNME değil, aynı ekranın ayarı. `push` olsaydı
 * altı ay ileri giden kullanıcının geri tuşu onu altı kez geri
 * sürüklerdi; oysa beklenen, bir kez basınca Planlama'dan çıkmak.
 * Sekme değişimi ise gerçek gezinmedir ve `<Link>` ile `push` olarak
 * kalır.
 *
 * ── Neden `scroll: false`? ──
 * Ayı değiştirmek sayfayı başa sarmamalı; kullanıcı ızgaranın ortasına
 * bakıyor olabilir.
 */
export function usePlanlamaSurface(scale: PlanScale): PlanlamaSurface {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const today = useMemo(() => todayStr(), []);

  const rawAnchor = params.get(ANCHOR_PARAM);

  /*
   * URL'den gelen değer DOĞRULANIR ve ölçeğe göre hizalanır.
   *
   * Kullanıcı adres çubuğuna `?ay=çorba` yazabilir; `isDateStr` guard'ı
   * geçmeyen her şey bugüne düşer. Geçerli bir tarih gelse bile ayın
   * ortası olabilir (`?ay=2026-08-17`) — çapa ölçeğin İLK GÜNÜ olmak
   * zorundadır, yoksa `eachDay(anchor, endOfIsoWeek(anchor))` yedi
   * günden az üretir ve ızgara eksik çizilir.
   */
  const anchor = useMemo(() => {
    const base =
      rawAnchor !== null && isDateStr(rawAnchor) ? rawAnchor : today;
    return scale === "week" ? startOfIsoWeek(base) : startOfMonth(base);
  }, [rawAnchor, scale, today]);

  const rawCategory = params.get(CATEGORY_PARAM);
  const category: CategoryFilter =
    rawCategory === null
      ? null
      : rawCategory === NO_CATEGORY
        ? "none"
        : rawCategory;

  /*
   * Tek bir yazma yolu: mevcut sorgu dizesini kopyalar, bir anahtarı
   * değiştirir. Kopyalamak şart — `useSearchParams` sonucu salt
   * okunurdur ve doğrudan değiştirmek sessizce çalışmazdı.
   */
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null) next.delete(key);
      else next.set(key, value);

      const query = next.toString();
      router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [params, pathname, router],
  );

  const setAnchor = useCallback(
    (next: DateStr) => {
      /*
       * Bugünün haftası/ayı ise parametre SİLİNİR, yazılmaz. Böylece
       * temiz `/planlama/ay` adresi varsayılan görünümü gösterir ve
       * "bu ay"a dönmek URL'i de sıfırlar — kullanıcı adres çubuğunda
       * eski bir ay görmez.
       */
      const current = scale === "week" ? startOfIsoWeek(today) : startOfMonth(today);
      setParam(ANCHOR_PARAM, next === current ? null : next);
    },
    [scale, today, setParam],
  );

  const setCategory = useCallback(
    (next: CategoryFilter) => {
      setParam(
        CATEGORY_PARAM,
        next === null ? null : next === "none" ? NO_CATEGORY : next,
      );
    },
    [setParam],
  );

  return { today, anchor, category, setAnchor, setCategory };
}
