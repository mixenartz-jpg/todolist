import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode;
}

/** Boş durum arayüzü öğretmelidir, "burada bir şey yok" dememelidir. */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h2 className="text-[length:var(--text-xl)] font-medium">{title}</h2>
      <p className="mt-2 max-w-sm text-[length:var(--text-base)] leading-relaxed text-[var(--color-ink-2)]">
        {description}
      </p>

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-[var(--color-accent)] px-4 font-medium text-white transition-colors duration-[var(--duration-fast)] hover:bg-[#4a94ea]"
        >
          {actionLabel}
        </Link>
      )}

      {children}
    </div>
  );
}
