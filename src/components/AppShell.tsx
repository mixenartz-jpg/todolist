"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  GridIcon,
  ListIcon,
  NoteIcon,
} from "@/components/icons";

interface NavItem {
  href: string;
  label: string;
  /**
   * Alt sekme çubuğu için kısa etiket. Altı sekme 320px'e bölününce
   * sekme başına ~53px kalır ve "İstatistik" oraya sığmaz. Kısaltma
   * verilmezse `label` kullanılır.
   */
  shortLabel?: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { href: "/", label: "Tablo", icon: <GridIcon /> },
  { href: "/bugun", label: "Bugün", icon: <CheckIcon /> },
  { href: "/takvim", label: "Takvim", icon: <CalendarIcon /> },
  {
    href: "/istatistik",
    label: "İstatistik",
    // "İstatistik" yerine "Durum" DEĞİL: sekme adı içeriğini
    // söylemeli. Kısaltma aynı kelimenin yaygın kısa biçimidir.
    shortLabel: "İstat.",
    icon: <ChartIcon />,
  },
  { href: "/rutinler", label: "Rutinler", icon: <ListIcon /> },
  /*
   * Notlar ve Yanlışlar tek sekmede birleşir; ikisi de "yazdığım
   * şeyler" ve ayrımı kendi alt sekmeleri yapar. Ayrı birer sekme
   * olsalardı çubuk yediye çıkar, sekme başına ~45px kalırdı.
   */
  { href: "/defter", label: "Defter", icon: <NoteIcon /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <NavRail />
      {/* overflow-x-hidden değil min-w-0: geniş içerik kendi kaydırma
          konteynerinde kalsın, sayfayı yana itmesin. */}
      <main className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-clip pb-16 md:pb-0">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}

/** Masaüstü kenar çubuğu. */
function NavRail() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Ana gezinme"
      className="hidden w-52 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-5 md:flex"
    >
      <div className="mb-6 px-2">
        <span className="text-[length:var(--text-lg)] font-semibold tracking-[-0.02em]">
          Rutin
        </span>
      </div>

      <ul className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={cn(
                "group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[length:var(--text-base)]",
                "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
                // Vurgu rengi mevcut seçimi bildirir — dekorasyon değil.
                // Yan şerit KULLANILMAZ; ikon renklenir ve zemin
                // vurgunun kendi tonuna kayar.
                isActive(pathname, item.href)
                  ? "bg-[color-mix(in_oklch,var(--color-accent)_15%,transparent)] font-medium text-[var(--color-ink)]"
                  : "text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]",
              )}
            >
              <span
                className={cn(
                  "shrink-0 transition-colors duration-[var(--duration-fast)]",
                  isActive(pathname, item.href)
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-2)]",
                )}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-auto px-1">
        <SignOutButton />
      </div>
    </nav>
  );
}

/** Mobil alt sekme çubuğu. */
function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Ana gezinme"
      className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] flex border-t border-[var(--color-line)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            // `min-w-0`: flex öğeleri varsayılan olarak içeriklerinden
            // daha dar olamaz; onsuz uzun etiket sekmeyi şişirir ve
            // altı sekme 320px'e sığmaz.
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-2.5",
            "text-[length:var(--text-2xs)]",
            "transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
            "active:scale-[0.97]",
            isActive(pathname, item.href)
              ? "font-medium text-[var(--color-accent)]"
              : "text-[var(--color-ink-3)]",
          )}
        >
          {item.icon}
          <span className="max-w-full truncate">
            {item.shortLabel ?? item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}

function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/giris");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="flex h-8 w-full items-center rounded-md px-2.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink-2)]"
    >
      Çıkış yap
    </button>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

