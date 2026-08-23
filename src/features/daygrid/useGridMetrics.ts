"use client";

import { useEffect, useState, type RefObject } from "react";
import type { HourWindow } from "./range";
import type { GridMetrics } from "./geometry";

/**
 * Satır yüksekliğinin yedeği — token okunamazsa kullanılır.
 *
 * `globals.css`'teki mobil değerle aynı. Yedek olmasaydı token bir
 * şekilde boşaldığında `hourHeight` 0 olur, her blok tuvalin tepesine
 * yığılır ve ızgara sessizce çöker. Kalıcı koruma e2e kanaryasında
 * (REQUIRED_TOKENS); bu yalnızca ilk boyamayı ayakta tutar.
 */
const FALLBACK_HOUR_HEIGHT = 52;

/**
 * Izgaranın ölçülerini CSS'ten okur.
 *
 * `--daygrid-hour-h` 768px'te değişiyor ve blok konumları JS'te
 * hesaplanıyor; değer TS'te sabit yazılsaydı kırılma noktasında CSS ile
 * JS ayrışır ve bloklar saat çizgilerinden kayardı. Tek kaynak CSS,
 * okuma yönü buradan.
 *
 * `ScreenHeader`'ın `--header-h` yayımlamasıyla aynı desen, ters yön:
 * o DOM'dan ölçüp CSS'e yazar, bu CSS'ten okuyup JS'e verir.
 */
export function useGridMetrics(
  ref: RefObject<HTMLElement | null>,
  window: HourWindow,
): GridMetrics {
  const [hourHeight, setHourHeight] = useState(FALLBACK_HOUR_HEIGHT);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function read() {
      const node = ref.current;
      if (!node) return;
      const raw = getComputedStyle(node).getPropertyValue("--daygrid-hour-h");
      const parsed = Number.parseFloat(raw);
      setHourHeight(Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_HOUR_HEIGHT);
    }

    read();

    // Kırılma noktası geçildiğinde token değişir ama eleman yeniden
    // takılmaz; yeniden ölçmenin tek tetikleyicisi boyut değişimidir.
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return {
    hourHeight,
    startMinute: window.startMinute,
    endMinute: window.endMinute,
  };
}
