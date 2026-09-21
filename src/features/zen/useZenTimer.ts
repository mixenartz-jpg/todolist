"use client";

import { useEffect, useState } from "react";
import { elapsedSeconds } from "./zen";

/**
 * Zen oturumunun sayacı.
 *
 * ── Neden `setInterval` ile sayı ARTIRMIYOR? ──
 * `count + 1` her saniyede bir birikimli hata biriktirir: tarayıcı
 * arka plandaki sekmede zamanlayıcıları kısıtlar (bazılarını dakikada
 * bire indirir) ve sayaç gerçek süreden sapar. Kullanıcı sekmeyi geri
 * açtığında yirmi dakikalık odağı "üç dakika" diye okurdu.
 *
 * Bunun yerine BAŞLANGIÇ DAMGASI tutuluyor ve her tik farkı YENİDEN
 * hesaplıyor. Zamanlayıcı ne kadar kısıtlanırsa kısıtlansın, bir
 * sonraki tikte doğru değere atlar.
 */
export function useZenTimer(): number {
  /*
   * Başlangıç damgası ilk render'da BİR KEZ okunuyor (lazy initial
   * state) ve bir daha değişmiyor. Efektin içinde okunsaydı, ilk tik
   * gelene kadar geçen süre kaybolurdu — ve sıfırlamak için efektin
   * içinde `setSeconds(0)` yazmak gerekirdi ki bu da gereksiz bir
   * render turu demek.
   *
   * Sıfırlama sorunu zaten YOK: `ZenScreen` yalnızca Zen açıkken
   * takılıyor ve çıkışta sökülüyor, yani hook her oturumda sıfırdan
   * doğuyor.
   */
  const [startedAt] = useState(() => Date.now());
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds(elapsedSeconds(startedAt, Date.now()));
    }, 1000);

    /*
     * Sekme geri öne geldiğinde ANINDA düzelt: bir sonraki tiki
     * beklemek, kullanıcının yanlış bir sayı gördüğü bir saniye
     * bırakırdı ve o saniye tam da en çok bakılan an.
     */
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      setSeconds(elapsedSeconds(startedAt, Date.now()));
    }

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [startedAt]);

  return seconds;
}
