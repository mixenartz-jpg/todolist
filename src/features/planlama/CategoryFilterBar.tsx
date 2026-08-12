"use client";

import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import type { Category, CategoryFilter } from "./types";

interface CategoryFilterBarProps {
  categories: readonly Category[];
  value: CategoryFilter;
  onChange: (next: CategoryFilter) => void;
  /** Filtre başına açık iş sayısı — çipte gösterilir. */
  counts: ReadonlyMap<string, number>;
  /** Kategorisiz açık iş sayısı. */
  uncategorizedCount: number;
}

/**
 * Kategori filtre çipleri.
 *
 * Hiç kategori yoksa HİÇ ÇİZİLMEZ: boş bir filtre çubuğu, kullanıcıya
 * kullanamayacağı bir kontrol göstermek olurdu.
 *
 * "Etiketsiz" çipi yalnızca kategorisiz iş VARKEN görünür. Sıfır
 * sayılı bir çip tıklanınca boş bir ızgara açar ve kullanıcı neden
 * boş olduğunu anlamaz.
 *
 * Çipler `aria-pressed` ile durumlarını duyurur; seçili çip ayrıca
 * kategori rengini kenarlığında taşır — ama renk tek başına bilgi
 * değil, `aria-pressed` ve zemin farkı da var.
 */
export function CategoryFilterBar({
  categories,
  value,
  onChange,
  counts,
  uncategorizedCount,
}: CategoryFilterBarProps) {
  if (categories.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Kategoriye göre süz"
      className="mt-2 flex flex-wrap items-center gap-1.5"
    >
      <FilterChip
        label="Hepsi"
        active={value === null}
        onClick={() => onChange(null)}
      />

      {categories.map((c) => (
        <FilterChip
          key={c.id}
          label={c.name}
          count={counts.get(c.id) ?? 0}
          color={slotVar(c.colorSlot)}
          active={value === c.id}
          // Seçili çipe tekrar basmak filtreyi KALDIRIR: tek dokunuşla
          // geri dönmek, "Hepsi"ne gitmek için gözle aramaktan hızlı.
          onClick={() => onChange(value === c.id ? null : c.id)}
        />
      ))}

      {uncategorizedCount > 0 && (
        <FilterChip
          label="Etiketsiz"
          count={uncategorizedCount}
          active={value === "none"}
          onClick={() => onChange(value === "none" ? null : "none")}
        />
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[length:var(--text-xs)]",
        "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
        active
          ? "border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)] text-[var(--color-ink)]"
          : "border-[var(--color-line)] text-[var(--color-ink-2)] hover:border-[var(--color-line-2)] hover:text-[var(--color-ink)]",
      )}
    >
      {color !== undefined && (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
      )}

      <span className="max-w-32 truncate">{label}</span>

      {count !== undefined && count > 0 && (
        <span className="tabular text-[var(--color-ink-3)]">{count}</span>
      )}
    </button>
  );
}
