"use client";

import { useCallback, useMemo, useState } from "react";
import { addDays } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";

/*
 * Katlanmış haftaların kümesi — ay ölçeğinin bölüm durumu.
 *
 * ── `useCollapsedDays` ile aynı desen, TERS varsayılan ──
 * Günler varsayılan AÇIK, haftalar varsayılan KAPALI. Buna rağmen
 * her iki kümede de KATLI olanlar durur; ikisi aynı zihinsel modeli
 * paylaşsın diye. Birinin açık, diğerinin kapalı tuttuğu bir tasarım
 * her okuyuşta hangisinin hangisi olduğunu hatırlamayı gerektirirdi.
 *
 * Varsayılan farkı kümenin BAŞLANGIÇ değerinde: günlerde boş küme
 * (hepsi açık), haftalarda bugünün haftası hariç hepsi (yalnızca o
 * açık).
 *
 * ── Neden ekranda, bölümde değil? ──
 * `useCollapsedDays` ile aynı gerekçe: ay değiştiğinde React bölüm
 * bileşenlerini yeniden kullanır ve katlama durumu YANLIŞ haftalara
 * yapışırdı.
 */
export interface CollapsedWeeks {
  collapsedWeeks: ReadonlySet<DateStr>;
  toggleWeek: (weekStart: DateStr) => void;
}

/**
 * Açılışta katlanacak haftalar: bugünün haftası HARİÇ hepsi.
 *
 * Hepsi kapalı olsaydı ekranı açar açmaz hiçbir iş görünmezdi ve
 * "şu an ne yapmalıyım" sorusu bir tıklama uzağa düşerdi.
 *
 * Geçmiş ya da gelecek bir aya bakarken `today` hiçbir haftaya
 * düşmez ve doğal olarak hepsi kapalı gelir — istenen davranış bu:
 * o aya "kurmak" için gidilir, hangi haftayla ilgilenildiği
 * seçilerek belirtilir.
 */
function collapseAllButToday(
  weekStarts: readonly DateStr[],
  today: DateStr,
): ReadonlySet<DateStr> {
  return new Set(
    // Hafta bölümleri 7 günlük; son gün başlangıç + 6.
    weekStarts.filter((start) => !(start <= today && today <= addDays(start, 6))),
  );
}

/**
 * @param anchor  Görüntülenen aralık. Değişince küme yeniden kurulur.
 * @param weekStarts  Bölümlerin başlangıç tarihleri, sırayla.
 *   REFERANS OLARAK SABİT OLMALI (çağıran `useMemo` ile sabitler);
 *   her render'da yeni bir dizi gelirse varsayılan küme yeniden
 *   kurulur ve kullanıcının açtığı hafta anında geri kapanır.
 * @param today  Bugün — açık kalacak haftayı seçer.
 */
export function useCollapsedWeeks(
  anchor: DateStr,
  weekStarts: readonly DateStr[],
  today: DateStr,
): CollapsedWeeks {
  /*
   * `weekStarts` ÇAĞIRAN tarafından `useMemo` ile sabitlenir
   * (`PlanlamaMonthScreen`). Sabit olmasaydı varsayılan küme her
   * render'da yeniden kurulur ve kullanıcının açtığı hafta anında
   * geri kapanırdı — yani bu, hook'un çağıranından beklediği bir
   * sözleşme.
   */
  const defaults = useMemo(
    () => collapseAllButToday(weekStarts, today),
    [weekStarts, today],
  );

  /*
   * Aralık değişince küme yeniden kurulur — efekt İÇİNDE `setState`
   * ile DEĞİL, "değişen anahtardan türetme" kalıbıyla
   * (`useCollapsedDays` ile aynı gerekçe: efekt fazladan bir render
   * turu üretir ve ay değiştirdiğin karede yanlış haftalar bir an
   * açık görünürdü).
   */
  const [state, setState] = useState<{
    anchor: DateStr;
    weeks: ReadonlySet<DateStr>;
  } | null>(null);

  const collapsedWeeks =
    state !== null && state.anchor === anchor ? state.weeks : defaults;

  const toggleWeek = useCallback(
    (weekStart: DateStr) => {
      setState((prev) => {
        const base =
          prev !== null && prev.anchor === anchor ? prev.weeks : defaults;
        const next = new Set(base);
        if (next.has(weekStart)) next.delete(weekStart);
        else next.add(weekStart);
        return { anchor, weeks: next };
      });
    },
    [anchor, defaults],
  );

  return { collapsedWeeks, toggleWeek };
}
