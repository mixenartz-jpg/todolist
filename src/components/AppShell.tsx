"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { href: "/", label: "Tablo", icon: <GridIcon /> },
  { href: "/bugun", label: "Bugün", icon: <CheckIcon /> },
  { href: "/takvim", label: "Takvim", icon: <CalendarIcon /> },
  { href: "/istatistik", label: "İstatistik", icon: <ChartIcon /> },
  { href: "/rutinler", label: "Rutinler", icon: <ListIcon /> },
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
                "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[length:var(--text-base)]",
                "transition-colors duration-[var(--duration-fast)]",
                isActive(pathname, item.href)
                  ? "bg-[var(--color-surface-3)] text-[var(--color-ink)]"
                  : "text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]",
              )}
            >
              <span className="shrink-0 text-[var(--color-ink-3)]">{item.icon}</span>
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
            "flex flex-1 flex-col items-center justify-center gap-1 py-2.5",
            "text-[length:var(--text-2xs)] transition-colors duration-[var(--duration-fast)]",
            isActive(pathname, item.href)
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-ink-3)]",
          )}
        >
          {item.icon}
          {item.label}
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

/* ── İkonlar ── currentColor kullanır, 1.5px çizgi ─────────────────── */

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 4h12M2 8h12M2 12h12M6 2v12M11 2v12"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8.5l3 3 7-7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="3"
        width="12"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M2 6.5h12M5.5 2v2M10.5 2v2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 13.5V9M6.5 13.5V4M10.5 13.5v-6M14 13.5V6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 4h8M6 8h8M6 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
