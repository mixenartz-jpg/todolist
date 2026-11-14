"use client";

/*
 * Yan panelin hatırladıkları (açık/kapalı, son kaynak/bölüm, son
 * eklenen miktar). Tarayıcı deposu yalnızca kolaylık: okunamazsa
 * (gizli pencere, engelli depo) varsayılanlarla çalışır.
 */

const PREFIX = "kero.katalog.";

export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, value);
  } catch {
    /* depo yoksa hatırlamadan devam */
  }
}

export function readAmount(kind: "test" | "range"): number {
  const n = Number(readPref(`miktar.${kind}`));
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 500) : kind === "test" ? 1 : 10;
}

export function writeAmount(kind: "test" | "range", n: number): void {
  if (n >= 1) writePref(`miktar.${kind}`, String(Math.floor(n)));
}
