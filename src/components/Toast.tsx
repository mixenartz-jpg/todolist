"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import "./toast.css";
import "./glass.css";

export type ToastVariant = "error" | "info";

interface ToastState {
  text: string;
  variant: ToastVariant;
  /**
   * Her `show` çağrısında artar. Aynı metin arka arkaya gösterilirse
   * React yine de yeni bir durum görür: zamanlayıcı sıfırlanır ve
   * bildirim yeniden canlanır.
   */
  seq: number;
}

/**
 * Bildirim. Varsayılan olarak hatadır — çağıranların çoğu bir mutation
 * `onError` geri çağrısıdır ve `(message: string) => void` imzasıyla
 * doğrudan geçirilir; ikinci parametre bu yüzden opsiyoneldir.
 */
export function useToast() {
  const [state, setState] = useState<ToastState | null>(null);
  const seq = useRef(0);

  const show = useCallback((text: string, variant: ToastVariant = "error") => {
    seq.current += 1;
    setState({ text, variant, seq: seq.current });
  }, []);

  const dismiss = useCallback(() => setState(null), []);

  return {
    message: state?.text ?? null,
    variant: state?.variant ?? ("error" as ToastVariant),
    token: state?.seq ?? 0,
    show,
    dismiss,
  };
}

export function Toast({
  message,
  variant = "error",
  token = 0,
  onDismiss,
}: {
  message: string | null;
  variant?: ToastVariant;
  token?: number;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, token, onDismiss]);

  if (!message) return null;

  const isError = variant === "error";

  return (
    <div
      /*
       * `key`: yeni bir bildirim geldiğinde eleman yeniden takılır ve
       * `@starting-style` girişi yeniden oynar. Aynı metin ikinci kez
       * gösterilse bile `token` değiştiği için giriş tekrarlanır.
       */
      key={token}
      role="alert"
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "toast",
        // `glassChrome`: bildirim sayfanın üstünde yüzer ve altından
        // içerik akar — malzemenin doğru kullanımı. Zemin, blur ve
        // geri düşüşler glass.css'ten gelir.
        "glassChrome",
        "fixed inset-x-4 bottom-20 z-[var(--z-toast)] mx-auto flex max-w-sm items-start gap-3",
        "rounded-xl px-4 py-3 md:bottom-6",
        "shadow-[var(--shadow-overlay)]",
        // Kenarlık yerine `ring`: Tailwind ring'i gölgeyle aynı
        // `box-shadow` bileşiminde ayrı bir değişkende taşır, ikisi
        // birbirini ezmez. Yan şerit YOK — çevreyi saran ince hat.
        isError
          ? "ring-1 ring-[color-mix(in_oklch,var(--color-danger)_38%,transparent)]"
          : "ring-1 ring-[var(--glass-line-strong)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-[0.4rem] size-1.5 shrink-0 rounded-full",
          isError ? "bg-[var(--color-danger)]" : "bg-[var(--color-accent)]",
        )}
      />

      <p className="flex-1 text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink)]">
        {message}
      </p>

      <button
        onClick={onDismiss}
        aria-label="Bildirimi kapat"
        className={cn(
          "-mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-md",
          "text-[var(--color-ink-3)]",
          "transition-[color,background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
          "hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink)]",
          "active:scale-[0.97]",
        )}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3.5 3.5l7 7M10.5 3.5l-7 7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
