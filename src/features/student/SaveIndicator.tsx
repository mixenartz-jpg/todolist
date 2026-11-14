"use client";

import type { SaveStatus } from "@/lib/ui/useAutosave";
import { cn } from "@/lib/ui/cn";

const TEXT: Record<SaveStatus, string> = {
  idle: "",
  pending: "Değişiklik var…",
  saving: "Kaydediliyor…",
  saved: "Kaydedildi ✓",
  error: "Kaydedilemedi — tekrar dene",
};

/** Otomatik kaydın küçük durum satırı. `aria-live`: ekran okuyucu da duysun. */
export function SaveIndicator({ status, className }: { status: SaveStatus; className?: string }) {
  return (
    <span
      aria-live="polite"
      className={cn(
        "text-[length:var(--text-2xs)] transition-opacity duration-[var(--duration-fast)]",
        status === "idle" ? "opacity-0" : "opacity-100",
        status === "saved" && "text-[var(--color-good)]",
        status === "error" && "text-[var(--color-danger)]",
        (status === "pending" || status === "saving") && "text-[var(--color-ink-3)]",
        className,
      )}
    >
      {TEXT[status]}
    </span>
  );
}
