"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

/*
 * Yalnızca ikon taşıyan kare düğme.
 *
 * `Toast`, `TaskItem`, `NoteItem`, `MistakeRow`, `RenameRow`,
 * `DayDetailSheet` ve `PlanDaySheet` bunu ayrı ayrı çiziyordu —
 * hepsi `<Button size="sm" variant="ghost" className="px-2">` ile
 * `<button className="size-7 ...">` arasında gidip geliyordu.
 *
 * ── `label` neden ZORUNLU? ──
 * İçinde metin olmayan bir düğmenin erişilebilir adı yoktur; ekran
 * okuyucu "düğme" der ve kullanıcı ne yaptığını bilemez. `label`
 * opsiyonel olsaydı bu bir KONVANSİYON olurdu ve unutulurdu; zorunlu
 * olunca DERLEME HATASI oluyor. Farkı budur.
 */

type IconButtonTone = "default" | "danger";
type IconButtonSize = "sm" | "md";

const TONES: Record<IconButtonTone, string> = {
  default:
    "text-[var(--color-ink-3)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink)] active:bg-[var(--color-surface-2)]",
  danger:
    "text-[var(--color-ink-3)] hover:bg-[color-mix(in_oklch,var(--color-danger)_14%,transparent)] hover:text-[var(--color-danger)]",
};

const SIZES: Record<IconButtonSize, string> = {
  sm: "size-7 rounded-md",
  md: "size-9 rounded-lg",
};

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Erişilebilir ad. Zorunlu — gerekçe yukarıda. */
  label: string;
  size?: IconButtonSize;
  tone?: IconButtonTone;
  children: ReactNode;
}

export function IconButton({
  label,
  size = "sm",
  tone = "default",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        /* Basıldığında hafif küçülme: arayüzün dokunuşu duyduğunu
         * ANINDA söyler. Geri bildirim basma anında verilir, bırakma
         * anında değil. */
        "transition-[color,background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
        "not-disabled:active:scale-[0.94]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      {children}
    </button>
  );
}
