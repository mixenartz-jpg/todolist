"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  /*
   * Birincil eylem: BEYAZ dolgu, koyu metin.
   *
   * Vurgu artık kobalt değil mürekkebin kendisi (bkz. globals.css).
   * Monokrom bir kabukta "en yüksek kontrast" en güçlü sinyaldir ve
   * onu tek bir eleman taşımalı — bu yüzden sayfada tek bir birincil
   * düğme olur.
   *
   * Odak halkası `--shadow-focus` ile geliyor (aşağıda): global
   * `:focus-visible` outline'ı BEYAZ ve beyaz dolgunun üstünde
   * tamamen kaybolurdu. İki katmanlı koyu-sonra-açık halka çözer.
   *
   * Kenarlığı YOK — kenarlık ve gölge aynı elemanda birleşmez.
   */
  primary:
    "bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-[var(--shadow-raised),var(--sheen-top)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)] active:shadow-none disabled:bg-[var(--color-accent-soft)] disabled:text-[var(--color-ink-3)] disabled:shadow-none focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
  secondary:
    "bg-[var(--color-surface-3)] text-[var(--color-ink)] hover:bg-[var(--color-line)] active:bg-[var(--color-surface-2)] border border-[var(--color-line-2)]",
  ghost:
    "text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] active:bg-[var(--color-surface-3)]",
  danger:
    "bg-transparent text-[var(--color-danger)] hover:bg-[color-mix(in_oklch,var(--color-danger)_14%,transparent)] border border-[color-mix(in_oklch,var(--color-danger)_35%,transparent)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[length:var(--text-sm)] rounded-md gap-1.5",
  md: "h-10 px-4 text-[length:var(--text-base)] rounded-lg gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        // Basıldığında hafif küçülme: arayüzün dokunuşu duyduğunu
        // anında söyler. Geri bildirim basma anında verilir, bırakma
        // anında değil.
        "transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
        "not-disabled:active:scale-[0.97]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading && (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
