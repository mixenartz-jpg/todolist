"use client";

import { useState } from "react";
import { cn } from "@/lib/ui/cn";
import { ESTIMATE_PRESETS, formatEstimate, parseEstimateInput } from "./estimate";

/**
 * Tahmini süre seçici — görev satırının ALTINDA açılır.
 *
 * Hazır değerler tek dokunuşla kaydeder ve seçiciyi kapatır: süre
 * vermek, satırı "düzenleme moduna" sokacak kadar büyük bir iş değil.
 * Listede olmayan değer "Özel" kutusuna yazılır ("40", "1,5 saat").
 */
export function EstimatePicker({
  taskTitle,
  value,
  onChange,
  onClose,
}: {
  taskTitle: string;
  value: number | null;
  onChange: (minutes: number | null) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState("");
  const [invalid, setInvalid] = useState(false);

  function pick(minutes: number | null) {
    if (minutes !== value) onChange(minutes);
    onClose();
  }

  function commitCustom() {
    if (custom.trim().length === 0) return;
    const minutes = parseEstimateInput(custom);
    if (minutes === null) {
      setInvalid(true);
      return;
    }
    pick(minutes);
  }

  return (
    <div
      role="group"
      aria-label={`${taskTitle}: tahmini süre`}
      className="mt-2 flex flex-wrap items-center gap-1.5"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {ESTIMATE_PRESETS.map((minutes) => (
        <button
          key={minutes}
          type="button"
          aria-pressed={value === minutes}
          onClick={() => pick(minutes)}
          className={cn(
            "tabular rounded-full border px-2.5 py-1 text-[length:var(--text-xs)]",
            "transition-colors duration-[var(--duration-fast)]",
            value === minutes
              ? "border-[var(--color-accent)] bg-[var(--color-surface-3)] text-[var(--color-ink)]"
              : "border-[var(--color-line-2)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]",
          )}
        >
          {formatEstimate(minutes)}
        </button>
      ))}

      <input
        value={custom}
        placeholder="Özel: 40, 1,5 saat"
        aria-label={`${taskTitle}: özel süre`}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          setCustom(e.target.value);
          setInvalid(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitCustom();
          }
        }}
        className={cn(
          "w-32 rounded-full bg-[var(--color-surface-2)] px-2.5 py-1",
          "text-[length:var(--text-xs)] text-[var(--color-ink)] outline-none",
          "ring-1 placeholder:text-[var(--color-ink-4)]",
          invalid
            ? "ring-[var(--color-warn)]"
            : "ring-[var(--color-line-2)] focus:ring-[var(--color-accent)]",
        )}
      />

      {value !== null && (
        <button
          type="button"
          onClick={() => pick(null)}
          className="rounded-full px-2 py-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]"
        >
          Kaldır
        </button>
      )}
    </div>
  );
}

/**
 * Satırın sağındaki süre çipi ("30 dak", "2 saat").
 *
 * `onClick` verilirse düğmedir ve seçiciyi açar; verilmezse yalnızca
 * bir etikettir.
 */
export function EstimateChip({
  minutes,
  done,
  taskTitle,
  onClick,
}: {
  minutes: number;
  done: boolean;
  taskTitle: string;
  onClick?: () => void;
}) {
  const className = cn(
    "tabular shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5",
    "text-[length:var(--text-xs)] font-medium",
    // Bitmiş işin çipi de geri plana çekilir — satırın geri kalanı gibi.
    done
      ? "border-transparent bg-[var(--color-surface-3)] text-[var(--color-ink-3)]"
      : "border-[var(--color-line-2)] bg-[var(--color-surface-2)] text-[var(--color-ink-2)]",
  );

  const text = formatEstimate(minutes);

  if (!onClick) {
    return (
      <span className={className} title="Tahmini süre">
        {text}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Tahmini süreyi değiştir"
      aria-label={`${taskTitle}: tahmini süre ${text}, değiştir`}
      className={cn(
        className,
        "transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-accent)]",
      )}
    >
      {text}
    </button>
  );
}

/** Tahmini olmayan satırdaki soluk "+ süre" düğmesi — seçiciyi açar. */
export function EstimateAddButton({
  taskTitle,
  pressed,
  onClick,
}: {
  taskTitle: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={`${taskTitle}: tahmini süre ekle`}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border border-dashed px-2 py-0.5",
        "text-[length:var(--text-xs)] font-medium",
        "transition-colors duration-[var(--duration-fast)]",
        pressed
          ? "border-[var(--color-accent)] text-[var(--color-ink-2)]"
          : "border-[var(--color-line-2)] text-[var(--color-ink-3)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink-2)]",
      )}
    >
      + süre
    </button>
  );
}
