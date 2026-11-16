"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/ui/cn";
import { PlanBacklog } from "./PlanBacklog";

/**
 * Havuz üst çubukta bir düğme: sağdaki sabit sütun planı daraltıyordu.
 * Açılınca tarihsiz işler listelenir; biri seçilince liste kapanır ki
 * kullanıcı yerleştireceği günü görsün ("gün seç").
 */
export function PlanBacklogButton(props: ComponentProps<typeof PlanBacklog>) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = props.tasks.length;

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[length:var(--text-sm)] font-medium",
          "transition-colors duration-[var(--duration-fast)]",
          open || props.selectedId
            ? "border-[var(--color-accent)] text-[var(--color-ink)]"
            : "border-[var(--color-line-2)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
        )}
      >
        Havuz
        {count > 0 && (
          <span className="tabular rounded-full bg-[var(--color-surface-2)] px-1.5 text-[length:var(--text-2xs)]">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Havuz: tarihsiz işler"
          className="planBacklogPopover absolute right-0 top-full z-[var(--z-sticky)] mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-lg"
        >
          <PlanBacklog
            {...props}
            onSelect={(id) => {
              props.onSelect(id);
              if (id !== null) setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
