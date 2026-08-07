"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatShortDate } from "@/lib/ui/tr";
import { useAdvanceReview } from "./mutations";
import { EMPTY_MISTAKES, useMistakes } from "./queries";
import { dueMistakes, REVIEW_INTERVALS } from "./review";
import type { Mistake } from "./types";
import "@/components/list-motion.css";

/** Bugün ekranında gösterilecek azami tekrar sayısı. */
const MAX_VISIBLE = 8;

interface ReviewQueueProps {
  today: DateStr;
  onError: (message: string) => void;
}

/**
 * Bugün ekranındaki tekrar kuyruğu.
 *
 * ── Boşken HİÇBİR ŞEY render etmez ──
 * Başlık yok, boş durum yok, "0 tekrar" çipi yok. Vadesi gelen tekrar
 * olmayan bir günde Bugün ekranı bu bölüm hiç yokmuş gibi görünür.
 * Ekranı şişmekten koruyan tek karar budur.
 *
 * Liste sekizle sınırlıdır: iki haftalık bir yokluktan sonra biriken
 * kırk kayıt tüm ekranı ele geçirmemeli. Kalanı Yanlışlar ekranında.
 */
export function ReviewQueue({ today, onError }: ReviewQueueProps) {
  const { data } = useMistakes();
  const mistakes = data ?? EMPTY_MISTAKES;

  const due = useMemo(() => dueMistakes(mistakes, today), [mistakes, today]);
  const advance = useAdvanceReview(onError);

  if (due.length === 0) return null;

  const visible = due.slice(0, MAX_VISIBLE);
  const hidden = due.length - visible.length;

  return (
    <section>
      <h2 className="mb-2.5 flex items-center gap-1.5 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
        Tekrar
        <span className="tabular text-[var(--color-ink-3)]">{due.length}</span>
      </h2>

      <ul className="flex flex-col gap-1.5">
        {visible.map((mistake) => (
          <ReviewRow
            key={mistake.id}
            mistake={mistake}
            onDone={() => advance.mutate({ mistake, today })}
          />
        ))}
      </ul>

      {hidden > 0 && (
        <Link
          href="/defter/yanlislar"
          className="mt-2 inline-block text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-ink-2)]"
        >
          +{hidden} tekrar daha
        </Link>
      )}
    </section>
  );
}

function ReviewRow({
  mistake,
  onDone,
}: {
  mistake: Mistake;
  onDone: () => void;
}) {
  const label = `${mistake.ders} · ${mistake.konu}`;
  // Kaçıncı tekrarı bekliyor: aşama tamamlanan sayıdır, sıradaki bir
  // fazlasıdır.
  const step = mistake.reviewStage + 1;

  return (
    <li
      className={cn(
        "rowEnter flex items-center gap-2.5 rounded-xl border border-[var(--color-line)]",
        "bg-[var(--color-surface)] px-3 py-2.5",
        "transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-line-2)]",
      )}
    >
      <button
        type="button"
        onClick={onDone}
        aria-label={`${label}: tekrar edildi`}
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md border border-[var(--color-line-2)]",
          "transition-[border-color,background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
          "hover:border-[var(--color-accent)] active:scale-[0.92]",
        )}
      >
        <span className="sr-only">Tekrar edildi</span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[length:var(--text-base)]">{label}</p>
        <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          <span className="tabular">{formatShortDate(mistake.date)}</span> ·{" "}
          {step}. tekrar
          {step <= REVIEW_INTERVALS.length && ` (${REVIEW_INTERVALS[step - 1]} gün)`}
        </p>
      </div>
    </li>
  );
}
