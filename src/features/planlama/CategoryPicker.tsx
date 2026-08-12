"use client";

import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import type { Category } from "./types";

interface CategoryPickerProps {
  categories: readonly Category[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  /** Ekran okuyucunun hangi görevden bahsettiğini bilmesi için. */
  taskTitle: string;
}

/**
 * Görevin kategorisini seçer.
 *
 * Native `<select>`, elle yazılmış bir açılır menü DEĞİL: mobilde
 * platformun kendi seçicisi açılır (kaydırılabilir, büyük dokunma
 * hedefleri, klavyeyle çalışır) ve bunu elde yeniden yazmak odak
 * tuzağı, dış tıklama ve ok tuşu mantığı demekti. Kategori seçimi
 * nadir bir etkileşim; kendi bileşenini hak etmiyor.
 *
 * Renk noktası `<select>`'in İÇİNDE gösterilemez (option'lar
 * biçimlendirilemez), bu yüzden seçili kategorinin rengi yanında ayrı
 * bir nokta olarak durur.
 *
 * Arşivlenmiş kategoriler listede YOKTUR — ama görevin mevcut
 * kategorisi arşivliyse yine de gösterilir, yoksa `<select>` değeri
 * listede bulunmayan bir option'a işaret eder ve tarayıcı ilk
 * seçeneğe düşerek kullanıcının kategorisini sessizce değiştirmiş
 * gibi görünürdü.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  taskTitle,
}: CategoryPickerProps) {
  const active = categories.filter((c) => c.archivedAt === null);
  const current = value === null ? null : categories.find((c) => c.id === value);

  // Arşivli ama hâlâ atanmış kategoriyi listeye geri ekle.
  const options =
    current && current.archivedAt !== null ? [...active, current] : active;

  if (options.length === 0) return null;

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{`${taskTitle}: kategori`}</span>

      {current && (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: slotVar(current.colorSlot) }}
        />
      )}

      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : event.target.value)
        }
        className={cn(
          "max-w-28 rounded-md border border-[var(--color-line)] bg-[var(--color-surface-2)] px-1.5 py-1",
          "text-[length:var(--text-2xs)]",
          "transition-colors duration-[var(--duration-fast)]",
          current
            ? "text-[var(--color-ink-2)]"
            : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
        )}
      >
        {/* Boş seçenek "kategorisiz"dir ve birinci sınıf bir durumdur —
            görevlerin çoğu sınıflandırılmaz. */}
        <option value="">Kategorisiz</option>

        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.archivedAt !== null ? " (arşiv)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
