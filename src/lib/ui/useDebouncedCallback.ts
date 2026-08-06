"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Bir çağrıyı geciktirir; art arda gelen çağrılarda yalnızca sonuncusu
 * çalışır. Not alanının her tuş vuruşunda değil, yazma duraklayınca
 * kaydedilmesi için.
 *
 * Bileşen sökülürken bekleyen çağrı `flush` ile hemen gönderilir —
 * aksi halde yazılan son cümle kaybolur.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): { call: (...args: Args) => void; flush: () => void; cancel: () => void } {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Args | null>(null);

  // Callback referansı her render değişebilir; ref üzerinden en
  // günceli çağrılır ki debounce sıfırlanmasın.
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);

  const flush = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;

    const args = pending.current;
    pending.current = null;
    if (args !== null) latest.current(...args);
  }, []);

  const call = useCallback(
    (...args: Args) => {
      pending.current = args;
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        const queued = pending.current;
        pending.current = null;
        if (queued !== null) latest.current(...queued);
      }, delayMs);
    },
    [delayMs],
  );

  // Sökülürken bekleyeni gönder.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(() => {
    return () => flushRef.current();
  }, []);

  return { call, flush, cancel };
}
