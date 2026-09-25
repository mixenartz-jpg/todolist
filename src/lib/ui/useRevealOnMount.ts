"use client";

import { useEffect, type RefObject } from "react";

/**
 * Bir form ya da panel AÇILDIĞINDA onu bütünüyle ekrana getirir.
 *
 * ── Neden gerekli? ──
 * Açılan formun kutusu `autoFocus` alıyor ve tarayıcı yalnızca O
 * KUTUYU görünür kılacak kadar kaydırıyor. Kutunun altındaki
 * "Ekle / Vazgeç" düğmeleri ekranın dibinde — telefonda da sabit
 * sekme çubuğunun arkasında — kalıyordu; kullanıcı onlara ulaşmak
 * için başka bölümleri katlamak zorunda kalıyordu.
 *
 * `block: "nearest"`: form zaten tamamen görünüyorsa HİÇ kaydırmaz;
 * yalnızca taşan kısmı kadar kaydırır. Sekme çubuğunun payı
 * `html { scroll-padding-bottom }` ile hesaba katılır (globals.css).
 *
 * `requestAnimationFrame`: `autoFocus`'un kendi kaydırmasından SONRA
 * çalışsın; önce çalışırsa odak kaydırması onu geri alırdı.
 */
export function useRevealOnMount(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ref.current?.scrollIntoView({
        block: "nearest",
        behavior: reduce ? "auto" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
    // Yalnızca açılışta: form açıkken yazdıkça sayfa zıplamamalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
