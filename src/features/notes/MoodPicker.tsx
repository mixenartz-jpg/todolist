"use client";

import { cn } from "@/lib/ui/cn";
import { MOOD_LABELS, type Mood } from "./types";

const MOODS: Mood[] = [1, 2, 3, 4, 5];

/**
 * Ruh hali seçici.
 *
 * Emoji kullanılmaz: platformlar arası tutarsız görünür ve ekran
 * okuyucuda gürültü yapar. Bunun yerine yükselen bir çubuk dizisi —
 * ölçek olduğu bakışta anlaşılır ve renk düşükten yükseğe geçer.
 * Seçili değer ayrıca metinle yazılır, renk tek başına bilgi taşımaz.
 */
export function MoodPicker({
  value,
  onChange,
}: {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Bugün nasıl geçti?"
        className="flex items-end gap-1"
      >
        {MOODS.map((mood) => {
          const selected = value === mood;
          return (
            <button
              key={mood}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={MOOD_LABELS[mood]}
              title={MOOD_LABELS[mood]}
              onClick={() => onChange(selected ? null : mood)}
              className={cn(
                "grid w-8 place-items-end rounded-md pb-1 pt-1",
                "transition-colors duration-[var(--duration-fast)]",
                "hover:bg-[var(--color-surface-3)]",
              )}
            >
              <span
                className="w-full rounded-sm transition-all duration-[var(--duration-base)] ease-[var(--ease-out-quart)]"
                style={{
                  height: `${6 + mood * 4}px`,
                  background: selected ? moodColor(mood) : "var(--color-line-2)",
                }}
              />
            </button>
          );
        })}
      </div>

      <span className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
        {value ? MOOD_LABELS[value] : "Nasıl geçti?"}
      </span>
    </div>
  );
}

/**
 * Ruh hali rengi — düşükten yükseğe.
 *
 * Durum paletinden alınır (kırmızı→sarı→yeşil); rutin kimlik
 * renklerinden ayrıdır ki bir mood rengi rutin sanılmasın.
 */
function moodColor(mood: Mood): string {
  switch (mood) {
    case 1:
      return "var(--color-danger)";
    case 2:
      return "#e08a3c";
    case 3:
      return "var(--color-warn)";
    case 4:
      return "#7fb539";
    case 5:
      return "var(--color-good)";
  }
}
