"use client";

import { useCallback, useState } from "react";
import type { DateStr } from "@/lib/date/types";

/*
 * Katlanmış günlerin kümesi — ay ve hafta ölçeğinin ortak durumu.
 *
 * ── Neden KATLI olanlar tutuluyor, açık olanlar değil? ──
 * Varsayılan AÇIK olduğu için kapalı kümesi boş başlar ve yalnızca
 * kullanıcının dokunduğu günleri taşır. Tersi olsaydı küme neredeyse
 * tüm ayı tutardı ve her yeni gün, oluşturulur oluşturulmaz kümeye
 * eklenmek zorunda kalırdı. `JournalScreen`'in `openIds`'i ile aynı
 * gerekçe, tersine çevrilmiş hâli.
 *
 * ── Neden satırda değil, burada? ──
 * Bir ay 42 satır çiziyor. Her satırın kendi `useState`'i olsaydı ay
 * değiştirildiğinde React bileşenleri yeniden kullanır ve katlama
 * durumu YANLIŞ günlere yapışırdı — 14 Mart'ı kapatıp Nisan'a
 * geçince 14 Nisan kapalı gelirdi.
 *
 * ── Neden kalıcı DEĞİL (localStorage yok) ve aralıkla sıfırlanıyor? ──
 * Katlama bir OKUMA anının parçasıdır: "şu an bu güne bakmıyorum".
 * Ertesi gün geri yüklenmesi, kullanıcının bıraktığı yeri değil eski
 * bir kararı hatırlatırdı — `MistakeTree` ve `JournalScreen` ile aynı
 * karar. Ayrıca kapalı bir gün "boş" sanılabilir ve kalıcı olsaydı bu
 * yanılgı günlerce sürerdi.
 *
 * Aynı gerekçe aralık değişimi için de geçerli: başka bir aya geçip
 * geri dönmek yeni bir okuma anıdır. Küme `anchor` değişince
 * sıfırlanır (aşağıdaki efekt).
 */
export interface CollapsedDays {
  collapsedDays: ReadonlySet<DateStr>;
  toggleCollapsed: (date: DateStr) => void;
}

export function useCollapsedDays(anchor: DateStr): CollapsedDays {
  /*
   * Aralık değişince küme sıfırlanır — "değişen anahtardan türetme"
   * kalıbıyla, efekt İÇİNDE `setState` ile DEĞİL.
   *
   * Efekt kullanmak fazladan bir render turu üretirdi: React önce eski
   * kümeyle yeni ayı boyar, sonra efekt kümeyi temizler ve tekrar
   * boyar. Bu, ay değiştirdiğin karede yanlış günlerin bir an katlı
   * görünmesi demek. Anahtarı render sırasında karşılaştırmak
   * doğrusudur (React belgelerindeki "adjusting state when a prop
   * changes" kalıbı) ve `react-hooks/set-state-in-effect` kuralının
   * beklediği de budur.
   *
   * Sıfırlanmasaydı iki şey olurdu: (1) Ağustos'ta katladığın günler
   * kümede birikip kalırdı — oturum boyunca büyüyen, hiç küçülmeyen
   * bir liste; (2) Ağustos'a geri dönünce eski katlamalar geri gelir
   * ve bu, yukarıda savunulan "katlama bir OKUMA anının parçasıdır"
   * tasarımıyla çelişirdi.
   */
  const [state, setState] = useState<{
    anchor: DateStr;
    days: ReadonlySet<DateStr>;
  }>(() => ({ anchor, days: new Set() }));

  // Render sırasında karşılaştırma: `anchor` değiştiyse küme boş
  // başlar ve o karede zaten doğru değerle boyanır.
  const collapsedDays = state.anchor === anchor ? state.days : EMPTY;

  const toggleCollapsed = useCallback(
    (date: DateStr) => {
      setState((prev) => {
        // Aralık değişmişse sıfırdan başla — yukarıdaki türetmeyle
        // aynı kural, yazma tarafında.
        const base = prev.anchor === anchor ? prev.days : EMPTY;
        const next = new Set(base);
        if (next.has(date)) next.delete(date);
        else next.add(date);
        return { anchor, days: next };
      });
    },
    [anchor],
  );

  return { collapsedDays, toggleCollapsed };
}

/** Paylaşılan boş küme — her render'da yeni nesne üretmemek için. */
const EMPTY: ReadonlySet<DateStr> = new Set();
