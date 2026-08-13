import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  /**
   * Bağlam işareti. Dekorasyon değil: kullanıcı hangi ekranda boş bir
   * liste gördüğünü tek bakışta anlamalı. `AppShell` ikon dilinden
   * türetilir — yeni bir dil icat edilmez.
   */
  icon?: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode;
}

/** Boş durum arayüzü öğretmelidir, "burada bir şey yok" dememelidir. */
export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  actionHref,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      {icon && (
        <div
          aria-hidden
          /* Yüzey içinde oturan sakin bir disk. Gölge YOK — boş durum
             yükseltilmiş bir katman değil, sayfanın kendisidir. */
          className="mb-5 grid size-12 place-items-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-ink-3)]"
        >
          {icon}
        </div>
      )}

      <h2 className="text-[length:var(--text-xl)] font-medium tracking-[-0.01em]">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-[length:var(--text-base)] leading-relaxed text-[var(--color-ink-2)]">
        {description}
      </p>

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-[var(--color-accent)] px-4 font-medium text-[var(--color-on-accent)] transition-[background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:bg-[var(--color-accent-hover)] active:scale-[0.97]"
        >
          {actionLabel}
        </Link>
      )}

      {children}
    </div>
  );
}
