"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Card } from "@/components/Card";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { chipLabel } from "./days";

/**
 * Yatay kaydırılan gün çipleri. Seçili gün açılışta görünür alana
 * kaydırılır. Çip bir bağlantı (`?gun=`): geri tuşu ve yer imi çalışır.
 */
export function DayStrip({
  days,
  selected,
  today,
  hrefFor,
  marks,
}: {
  days: readonly DateStr[];
  selected: DateStr;
  today: DateStr;
  hrefFor: (date: DateStr) => string;
  /** Gün → küçük nokta rengi (ör. tamamlama tonu); yoksa nokta yok. */
  marks?: ReadonlyMap<DateStr, string>;
}) {
  const selectedRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selected]);

  return (
    <Card pad="sm" as="section" aria-label="Günler">
      <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((day) => {
          const active = day === selected;
          const mark = marks?.get(day);
          return (
            <li key={day} className="shrink-0">
              <Link
                ref={active ? selectedRef : undefined}
                href={hrefFor(day)}
                scroll={false}
                aria-current={active ? "date" : undefined}
                className={cn(
                  "relative flex h-9 items-center rounded-full border px-3.5 text-[length:var(--text-sm)] font-medium whitespace-nowrap",
                  "transition-colors duration-[var(--duration-fast)]",
                  active
                    ? "border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_16%,transparent)] text-[var(--color-ink)]"
                    : "border-[var(--color-line-2)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)]",
                  day > today && !active && "text-[var(--color-ink-3)]",
                )}
              >
                {day === today ? "Bugün" : chipLabel(day)}
                {mark && (
                  <span
                    aria-hidden
                    className="ml-1.5 size-1.5 rounded-full"
                    style={{ background: mark }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
