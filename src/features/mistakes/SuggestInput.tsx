"use client";

import { useId } from "react";

interface SuggestInputProps {
  label: string;
  value: string;
  suggestions: readonly string[];
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  onChange: (value: string) => void;
}

/**
 * Serbest metin girişi + geçmiş değerlerden öneri.
 *
 * Native `<datalist>` kullanılır, özel bir açılır liste değil.
 * Etkileşim "serbest yaz, ara sıra ipucu kabul et" — özel bir popover
 * odak yönetimi, klavye gezinme, dışarı tıklama ve mobil konumlandırma
 * gerektirirdi ve uygulamadaki tek böyle bileşen olurdu. Tarayıcılar
 * arası kozmetik tutarsızlık, bunun karşılığında kabul edilebilir.
 */
export function SuggestInput({
  label,
  value,
  suggestions,
  placeholder,
  maxLength,
  required = false,
  autoFocus = false,
  className,
  onChange,
}: SuggestInputProps) {
  const listId = useId();

  return (
    <label className={className}>
      <span className="mb-1.5 block text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
        {label}
      </span>
      <input
        list={listId}
        value={value}
        required={required}
        autoFocus={autoFocus}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface-2)] px-3 text-[length:var(--text-base)] outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-accent)]"
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </label>
  );
}
