"use client";

import { useCallback, useEffect, useState } from "react";

/** Basit hata bildirimi. Kaydetme başarısız olursa kullanıcıya söyler. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((text: string) => setMessage(text), []);
  const dismiss = useCallback(() => setMessage(null), []);

  return { message, show, dismiss };
}

export function Toast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-20 z-[var(--z-toast)] mx-auto max-w-sm rounded-lg border border-[color-mix(in_oklch,var(--color-danger)_40%,transparent)] bg-[var(--color-surface-2)] px-4 py-3 shadow-lg md:bottom-6"
    >
      <p className="text-[length:var(--text-sm)] text-[var(--color-ink)]">
        {message}
      </p>
      <button
        onClick={onDismiss}
        className="mt-1.5 text-[length:var(--text-xs)] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]"
      >
        Kapat
      </button>
    </div>
  );
}
