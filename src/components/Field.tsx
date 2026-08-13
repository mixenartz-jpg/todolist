"use client";

import { useId, type ReactNode } from "react";
import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/ui/cn";

/*
 * Form alanı primitifleri.
 *
 * Aynı girdi className'i on iki dosyada tekrarlanıyordu ve iki dosya
 * (`NoteForm.tsx`, `MistakeForm.tsx`) zaten yerel bir `const INPUT`
 * çıkarmıştı — soyutlama isteniyordu, sadece ortak bir evi yoktu.
 *
 * Prop'lar olduğu gibi geçer: bunlar kontrollü girdilerin davranışına
 * karışmaz, yalnızca görünümü ve erişilebilirlik bağlantılarını
 * standartlaştırır.
 *
 * `Field` sarmalayıcısı `id` / `aria-describedby` / `aria-invalid`
 * bağlantısını kendiliğinden kurar. Bunu elle yapmak on iki yerde
 * unutulabilirdi; burada unutmak mümkün değil.
 */

const BASE =
  "w-full bg-[var(--color-surface-2)] text-[var(--color-ink)] " +
  "placeholder:text-[var(--color-ink-3)] " +
  "border border-[var(--color-line-2)] outline-none " +
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)] " +
  /* Odakta kenar mürekkebe yaklaşır. Global `:focus-visible` outline'ı
   * yerinde kalır; ikisi birlikte hem klavye hem fare kullanıcısına
   * net bir sinyal verir. */
  "focus:border-[var(--color-line-3)] " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const SIZES = {
  sm: "h-9 rounded-md px-2.5 text-[length:var(--text-sm)]",
  md: "h-11 rounded-lg px-3 text-[length:var(--text-base)]",
} as const;

type FieldSize = keyof typeof SIZES;

interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: FieldSize;
  /** Kenarlığı hata rengine çevirir. `Field` bunu kendiliğinden geçer. */
  invalid?: boolean;
}

export function TextInput({
  size = "md",
  invalid = false,
  className,
  ...props
}: TextInputProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(
        BASE,
        SIZES[size],
        invalid && "border-[var(--color-danger)]",
        className,
      )}
    />
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function TextArea({ invalid = false, className, ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(
        BASE,
        "rounded-lg px-3 py-2.5 text-[length:var(--text-base)]",
        /* Uzun metin gövde satır aralığından daha rahat okunur. */
        "leading-[var(--leading-relaxed)]",
        invalid && "border-[var(--color-danger)]",
        className,
      )}
    />
  );
}

interface FieldProps {
  label: string;
  /**
   * Etiketi görsel olarak gizler ama ekran okuyucuya bırakır.
   * Bağlamı zaten belli olan alanlar için (arama kutusu, satır içi
   * yeniden adlandırma). Etiketi tamamen SİLMEK asla doğru değil.
   */
  labelHidden?: boolean;
  /** Yardım metni — alanın altında, sönük. */
  hint?: string;
  /** Hata metni. Verildiğinde `hint` gizlenir: ikisi aynı anda gürültü. */
  error?: string;
  /**
   * Girdiyi alan fonksiyon. `id` ve `aria-describedby` buradan
   * geçirilir; çağıran bunları elle kurmaz.
   */
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    invalid: boolean;
  }) => ReactNode;
  className?: string;
}

export function Field({
  label,
  labelHidden = false,
  hint,
  error,
  children,
  className,
}: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "text-[length:var(--text-sm)] text-[var(--color-ink-2)]",
          /* `hidden` DEĞİL: `display:none` etiketi ekran okuyucudan da
           * kaldırırdı. Bu kalıp görsel olarak gizler, erişilebilir
           * ağaçta bırakır. */
          labelHidden && "sr-only",
        )}
      >
        {label}
      </label>

      {children({ id, "aria-describedby": describedBy, invalid: Boolean(error) })}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-[length:var(--text-sm)] text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
