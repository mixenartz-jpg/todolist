"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isDateStr, todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import {
  anchorForScale,
  scaleFromParam,
  scaleToParam,
  type PlanScale,
} from "./range";
import type { CategoryFilter } from "./types";

/**
 * Çapanın yaşadığı sorgu parametresi.
 *
 * Adı "ay" DEĞİL "t": eski ad bir yalandı. Parametre ölçeğe göre ya
 * ayın 1'ine ya haftanın Pazartesi'sine çözülüyordu, yani aynı URL iki
 * farklı tarih anlamına geliyordu. `?ay=2026-08-01` ile Hafta ekranına
 * geçen kullanıcı 28 Temmuz'a düşüyordu — Ağustos'u planlarken Temmuz'a
 * atılmak. Artık parametre HER ZAMAN bir gündür ve hizalamayı ekran
 * yapar (bkz. `anchorForScale`).
 */
const ANCHOR_PARAM = "t";
/** Ölçeğin yaşadığı sorgu parametresi. */
const SCALE_PARAM = "ol";
/** Kategori filtresinin yaşadığı sorgu parametresi. */
const CATEGORY_PARAM = "kat";
/** "Kategorisi olmayanları göster" filtresinin URL'deki karşılığı. */
const NO_CATEGORY = "yok";


export interface PlanlamaSurface {
  /** Bugün — tek yerde hesaplanır, alt ekranlar aynı günü görür. */
  today: DateStr;
  /** Görüntülenen aralığın ilk günü (haftanın Pazartesi'si / ayın 1'i). */
  anchor: DateStr;
  scale: PlanScale;
  category: CategoryFilter;
  setAnchor: (next: DateStr) => void;
  setScale: (next: PlanScale) => void;
  /**
   * Belirli bir haftaya git: çapayı oraya taşı VE ölçeği haftaya çevir.
   *
   * ── Neden `setAnchor` + `setScale` ardışık ÇAĞRILAMAZ? ──
   * İkisi de aynı `params` anlık görüntüsünü kapatıyor ve her biri
   * URL'in tamamını yeniden yazıyor. Arka arkaya çağrılsalardı
   * ikincisi birincinin yazdığını görmeden üzerine yazardı — çapa
   * kaybolur, kullanıcı bastığı haftaya değil bulunduğu ayın ilk
   * haftasına düşerdi. Tek yazma, tek sonuç.
   */
  goToWeek: (weekStart: DateStr) => void;
  setCategory: (next: CategoryFilter) => void;
}

/**
 * Plan yüzeyinin durumu: çapa, ölçek ve kategori filtresi.
 *
 * ── Neden ölçek artık URL'de, ayrı bir ROTA değil? ──
 * Ay ve Hafta eskiden `/planlama/ay` ve `/planlama/hafta` idi ve aynı
 * `PlanDayRow`'u çiziyorlardı — `PlanWeekGrid`'in kendi yorumu bunu
 * itiraf ediyordu: "Yerleşim, ölçüler ve davranış birebir aynı."
 * Aynı görünen iki ekran sessizce farklı davranıyordu: gün numarasına
 * basmak Ay'da paneli açıyor, Hafta'da hiçbir şey yapmıyordu.
 *
 * İkisi ayrı ekran değil, TEK ekranın iki ölçeği. Rota birleşince
 * davranış da birleşti ve `?ay=`'ın iki anlamı sorunu kökten çözüldü.
 *
 * ── Neden URL, React state DEĞİL? ──
 * Paylaşılabilir, geri tuşuyla uyumlu ve yer imine eklenebilir —
 * "Ağustos planım" gerçekten bir sayfa olur. Ayrıca Hedefler ve Özet
 * hâlâ ayrı rotalar; aralarında gezinirken çapanın korunması gerekiyor
 * ve React state rota değişiminde kaybolurdu.
 *
 * ── Neden `replace`, `push` DEĞİL? ──
 * Ay ilerletmek bir GEZİNME değil, aynı ekranın ayarı. `push` olsaydı
 * altı ay ileri giden kullanıcının geri tuşu onu altı kez geri
 * sürüklerdi; oysa beklenen, bir kez basınca Planlama'dan çıkmak.
 *
 * ── Neden `scroll: false`? ──
 * Ayı değiştirmek sayfayı başa sarmamalı; kullanıcı ızgaranın ortasına
 * bakıyor olabilir.
 */
export function usePlanlamaSurface(): PlanlamaSurface {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const today = useMemo(() => todayStr(), []);

  const scale: PlanScale = scaleFromParam(params.get(SCALE_PARAM));

  const rawAnchor = params.get(ANCHOR_PARAM);

  /*
   * URL'den gelen değer DOĞRULANIR ve ölçeğe hizalanır.
   *
   * Kullanıcı adres çubuğuna `?t=çorba` yazabilir; `isDateStr` guard'ı
   * geçmeyen her şey bugüne düşer. Geçerli bir tarih gelse bile ayın
   * ortası olabilir (`?t=2026-08-17`) — çapa ölçeğin İLK GÜNÜ olmak
   * zorundadır, yoksa `eachDay(anchor, endOfIsoWeek(anchor))` yedi
   * günden az üretir ve ızgara eksik çizilir.
   *
   * Hizalamayı `anchorForScale` yapıyor: o fonksiyon yazılmış ve
   * testliydi ama HİÇBİR EKRAN ÇAĞIRMIYORDU. Çağrıldığı yer burası.
   */
  const anchor = useMemo(() => {
    const base = rawAnchor !== null && isDateStr(rawAnchor) ? rawAnchor : today;
    return anchorForScale(base, scale, today);
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
    (entries: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(entries)) {
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

  const setAnchor = useCallback(
    (next: DateStr) => {
      /*
       * Bugünün aralığı ise parametre SİLİNİR, yazılmaz. Böylece temiz
       * `/planlama` adresi varsayılan görünümü gösterir ve "bu ay"a
       * dönmek URL'i de sıfırlar — kullanıcı adres çubuğunda eski bir
       * tarih görmez.
       */
      const current = anchorForScale(today, scale, today);
      setParam({ [ANCHOR_PARAM]: next === current ? null : next });
    },
    [scale, today, setParam],
  );

  const setScale = useCallback(
    (next: PlanScale) => {
      /*
       * Ölçek değişince çapa YENİ ölçeğe hizalanır ve URL'e birlikte
       * yazılır. İkisini ayrı ayrı yazmak, aradaki karede eski çapayı
       * yeni ölçekle yorumlayan bir render üretirdi.
       *
       * Bakılan dönem KORUNUR: Ağustos'a bakarken Hafta'ya geçmek
       * Ağustos'un bir haftasını gösterir, bugüne ışınlamaz.
       */
      const aligned = anchorForScale(anchor, next, today);
      const defaultAnchor = anchorForScale(today, next, today);

      setParam({
        [SCALE_PARAM]: scaleToParam(next),
        [ANCHOR_PARAM]: aligned === defaultAnchor ? null : aligned,
      });
    },
    [anchor, today, setParam],
  );

  const goToWeek = useCallback(
    (weekStart: DateStr) => {
      /*
       * Çapa ZATEN bir Pazartesi (harita `weekStart` veriyor), yine
       * de hizalanıyor: çağıranın sözleşmeye uyduğunu varsaymak,
       * ileride başka bir yerden ayın ortası bir günle çağrıldığında
       * ızgaranın eksik çizilmesi demekti.
       */
      const aligned = anchorForScale(weekStart, "week", today);
      const defaultAnchor = anchorForScale(today, "week", today);

      setParam({
        [SCALE_PARAM]: scaleToParam("week"),
        [ANCHOR_PARAM]: aligned === defaultAnchor ? null : aligned,
      });
    },
    [today, setParam],
  );

  const setCategory = useCallback(
    (next: CategoryFilter) => {
      setParam({
        [CATEGORY_PARAM]:
          next === null ? null : next === "none" ? NO_CATEGORY : next,
      });
    },
    [setParam],
  );

  return {
    today,
    anchor,
    scale,
    category,
    setAnchor,
    setScale,
    goToWeek,
    setCategory,
  };
}

/** URL'de ölçeğin yazılı biçimi — sekme bağlantıları için. */
export { SCALE_PARAM, ANCHOR_PARAM, CATEGORY_PARAM };
