"use client";

import { useState } from "react";
import { useDebouncedCallback } from "./useDebouncedCallback";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Yazma duraklayınca kaydet; durumu "Kaydedildi ✓" göstergesi için
 * döndür. Bileşen sökülürken bekleyen kayıt gönderilir (bkz.
 * `useDebouncedCallback`).
 */
export function useAutosave<T>(save: (value: T) => Promise<unknown>, delayMs = 800) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const debounced = useDebouncedCallback((value: T) => {
    setStatus("saving");
    save(value).then(
      () => setStatus("saved"),
      () => setStatus("error"),
    );
  }, delayMs);

  return {
    status,
    schedule: (value: T) => {
      setStatus("pending");
      debounced.call(value);
    },
    flush: debounced.flush,
  };
}
