/** Sonraki fazda gelecek ekranlar için yer tutucu. */
export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[var(--color-line)] px-4 py-3 md:px-5">
        <h1 className="text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
          {title}
        </h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="max-w-sm text-[length:var(--text-base)] leading-relaxed text-[var(--color-ink-2)]">
          {description}
        </p>
      </div>
    </div>
  );
}
