"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { netSeconds, pauseTimer, resumeTimer, startTimer } from "./zen";
import type { TimerState } from "./types";

/**
 * Sekme kaç milisaniye gizli kalırsa sayaç otomatik duraklar.
 *
 * 60 saniye: sekme değiştirip bir PDF'e bakmak odağın PARÇASI; on
 * dakika başka bir şey yapmak değil. Eşiksiz olsaydı her sekme
 * değişimi oturumu bölerdi.
 */
const HIDDEN_PAUSE_THRESHOLD_MS = 60_000;

export interface FocusTimer {
  /** Duraklamalar düşülmüş net süre, saniye. */
  seconds: number;
  paused: boolean;
  /** Oturumun başlangıç damgası — kayıt için. */
  startedAtIso: string;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
}

/**
 * Odak oturumunun sayacı.
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
 *
 * ── Otomatik duraklatma ──
 * Sekme `HIDDEN_PAUSE_THRESHOLD_MS`ten uzun gizli kalırsa, sayaç
 * GİZLENME ANINA geri dönülerek duraklatılıyor — yani kayıp süre net
 * değere hiç girmiyor. Kaydedilen sürenin gerçek olmasını bu sağlıyor
 * ve `focus_sessions` tablosunun açılabilmesinin ön koşulu bu
 * (bkz. `zen.ts` ve 0021).
 */
export function useFocusTimer(): FocusTimer {
  /*
   * Başlangıç damgası ilk render'da BİR KEZ okunuyor (lazy initial
   * state). Efektin içinde okunsaydı ilk tik gelene kadar geçen süre
   * kaybolurdu.
   *
   * Sıfırlama sorunu YOK: `ZenScreen` yalnızca Zen açıkken takılıyor
   * ve çıkışta sökülüyor, yani hook her oturumda sıfırdan doğuyor.
   */
  const [state, setState] = useState<TimerState>(() => startTimer(Date.now()));

  /*
   * Ekranda gösterilen saniye DEĞİL, "şu an" damgası tutuluyor.
   *
   * Saniyeyi state'te tutmak, durum her değiştiğinde (duraklat,
   * sürdür) onu efektten ayrıca düzeltmeyi gerektiriyordu — ve
   * efektten `setState` çağırmak zincirleme render üretiyor.
   *
   * Damga tutulunca net süre RENDER SIRASINDA türetiliyor: duraklatma
   * anında doğru sayı, ek bir tur olmadan çiziliyor.
   */
  const [now, setNow] = useState(() => Date.now());

  /** Sekmenin gizlendiği an. Görünürken null. */
  const hiddenAtRef = useRef<number | null>(null);

  const pause = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setState((s) => pauseTimer(s, at));
  }, []);

  const resume = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setState((s) => resumeTimer(s, at));
  }, []);

  const toggle = useCallback(() => {
    const at = Date.now();
    /*
     * Damga da tazeleniyor: duraklatma anındaki sayı, bir sonraki
     * tiki beklemeden doğru çizilsin.
     */
    setNow(at);
    setState((s) => (s.pausedAt === null ? pauseTimer(s, at) : resumeTimer(s, at)));
  }, []);

  useEffect(() => {
    /*
     * Duraklatılmışken de tik ATIYOR ama `netSeconds` sabit döndüğü
     * için sayı donuyor. Zamanlayıcıyı durdurmak bir optimizasyon
     * olurdu; saniyede bir saf fonksiyon çağırmak zaten bedava ve
     * durdurmak, sürdürmede ilk tiki beklemek demekti.
     */
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onVisibility() {
      const at = Date.now();

      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = at;
        return;
      }

      /*
       * Sekme geri öne geldiğinde damga ANINDA tazeleniyor: bir
       * sonraki tiki beklemek, kullanıcının yanlış bir sayı gördüğü
       * bir saniye bırakırdı ve o saniye tam da en çok bakılan an.
       */
      setNow(at);

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;

      if (hiddenAt === null) return;

      /*
       * Eşiği aşan gizlilik: sayacı GİZLENME ANINA duraklat, sonra
       * ŞİMDİ sürdür. İki adımın birleşik etkisi, aradaki tüm sürenin
       * net değerden düşülmesi.
       *
       * Kullanıcı zaten duraklatmışsa dokunulmuyor: sürdürmek, elle
       * verilen bir kararı sekme değişimiyle geri almak olurdu.
       */
      /*
       * Eşiğin altındaysa sayaç doğru çalışmaya devam ediyor; damga
       * tazelemesi yukarıda zaten yapıldı ve başka bir şey gerekmiyor.
       */
      if (at - hiddenAt < HIDDEN_PAUSE_THRESHOLD_MS) return;

      setState((s) =>
        s.pausedAt !== null ? s : resumeTimer(pauseTimer(s, hiddenAt), at),
      );
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return {
    /* Render sırasında TÜRETİLİYOR — state'te ikinci bir kopya yok. */
    seconds: netSeconds(state, now),
    paused: state.pausedAt !== null,
    startedAtIso: new Date(state.startedAt).toISOString(),
    pause,
    resume,
    toggle,
  };
}
