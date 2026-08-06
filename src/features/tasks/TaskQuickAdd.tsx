"use client";

import { useState, type FormEvent } from "react";
import type { DateStr } from "@/lib/date/types";

interface TaskQuickAddProps {
  /** Yeni görevin tarihi. null → tarihsiz. */
  dueDate: DateStr | null;
  pending?: boolean;
  onAdd: (title: string) => void;
}

/**
 * Tek satırlık hızlı ekleme.
 *
 * Ayrı bir "yeni görev" modalı yok: görev eklemek tek cümle yazmaktır,
 * araya bir diyalog koymak akışı bozar. Enter'a basınca kaydeder ve
 * alan temizlenip odakta kalır — arka arkaya birkaç görev girmek
 * kesintisiz olur.
 */
export function TaskQuickAdd({ dueDate, pending = false, onAdd }: TaskQuickAddProps) {
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onAdd(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative flex-1">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)]"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3.5v9M3.5 8h9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder={dueDate ? "Görev ekle" : "Tarihsiz görev ekle"}
          className="h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-3 text-[length:var(--text-base)] outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-accent)]"
        />
      </div>

      {title.trim() && (
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 rounded-xl bg-[var(--color-accent)] px-4 font-medium text-white transition-colors duration-[var(--duration-fast)] hover:bg-[#4a94ea] disabled:opacity-50"
        >
          Ekle
        </button>
      )}
    </form>
  );
}
