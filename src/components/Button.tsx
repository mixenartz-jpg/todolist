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
  // Doygun dolgu üzerinde beyaz metin — Helmholtz-Kohlrausch etkisi
  // yüzünden koyu metin çamurlu okunur.
  primary:
    "bg-[var(--color-accent)] text-white hover:bg-[#4a94ea] active:bg-[#2f76cf] disabled:bg-[var(--color-accent-soft)]",
  secondary:
    "bg-[var(--color-surface-3)] text-[var(--color-ink)] hover:bg-[#242935] active:bg-[var(--color-surface-2)] border border-[var(--color-line-2)]",
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
        "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
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
