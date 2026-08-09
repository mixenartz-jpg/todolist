"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui/cn";

const TABS = [
  { href: "/takvim/ay", label: "Ay" },
  { href: "/takvim/hafta", label: "Hafta" },
] as const;

/**
 * Takvimin alt sekmeleri.
 *
 * Ay ve Hafta tek bir üst sekmede birleşir: ikisi de aynı şeyin —
 * zamanın — iki ölçekteki görünümüdür. Hafta ayrı bir üst sekme
 * olsaydı alt gezinme çubuğu yediye çıkardı; bütçe altıdır (320px'de
 * sekme başına ~53px) ve yedinci sekme dokunma hedeflerini
 * araştırılan eşiğin altına indirirdi. Defter'deki Notlar/Yanlışlar
 * ayrımı aynı gerekçeyle kurulmuştu.
 */
export function TakvimTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Takvim görünümleri"
      className="flex gap-1 rounded-lg bg-[var(--color-surface-2)] p-1"
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-[length:var(--text-sm)]",
              "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
              active
                ? "bg-[var(--color-surface-3)] font-medium text-[var(--color-ink)]"
                : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
