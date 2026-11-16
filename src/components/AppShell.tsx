"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { BrandMark } from "@/components/BrandMark";
import { createClient } from "@/lib/supabase/client";
import { QuickPanel } from "@/features/quickpanel/QuickPanel";
import { ZenProvider } from "@/features/zen/ZenProvider";
import {
  ArchiveIcon,
  ChartIcon,
  CheckIcon,
  HomeIcon,
  PersonIcon,
  TargetIcon,
} from "@/components/icons";
import "./nav-bar.css";
import "./glass.css";

interface NavItem {
  href: string;
  label: string;
  /**
   * Alt sekme çubuğu için kısa etiket. Sekmeler çubuğu eşit bölüşür
   * (bkz. nav-bar.css) ve 320px'de sekme başına ~64px düşer; uzun
   * adlar oraya sığmaz. Kısaltma verilmezse `label` kullanılır.
   */
  shortLabel?: string;
  icon: ReactNode;
  /**
   * İkincil: masaüstünde kenar çubuğunun ALTINDA küçük; mobilde
   * "Diğer" menüsünün içinde. Ana yüzey (Planlama) üstte tek başına.
   */
  secondary?: boolean;
}

/*
 * Sekme sırası GÜNÜN AKIŞINI izler: önce bugün ne yapacağım, sonra
 * ileriyi nasıl kuracağım, sonra nasıl gidiyorum.
 *
 * Beş sekme üst sınırdır — 320px'de eşit bölüşünce sekme başına 64px
 * düşer ve dokunma eşiği (44px) rahat geçilir. Altıncı sekme 53px'e
 * indirir ve "İstat." etiketi kırpılmaya başlar. Yeni bir yüzey
 * gerektiğinde sekme EKLENMEZ, var olanın içine girer.
 */
const COACH_NAV: NavItem[] = [
  /*
   * Sadeleştirme: Planlama koçun asıl işi, üstte tek başına. Panel,
   * Öğrenci, İstatistik ve Arşiv daha seyrek açılır; sol altta (mobilde
   * "Diğer" içinde) durur. Sayfaların hiçbiri silinmedi.
   */
  {
    href: "/koc/planlama",
    label: "Planlama",
    shortLabel: "Plan",
    icon: <TargetIcon />,
  },
  { href: "/koc/panel", label: "Panel", icon: <HomeIcon />, secondary: true },
  { href: "/koc/ogrenci", label: "Öğrenci", icon: <PersonIcon />, secondary: true },
  { href: "/koc/istatistik", label: "İstatistik", shortLabel: "İstat.", icon: <ChartIcon />, secondary: true },
  { href: "/koc/arsiv", label: "Arşiv", icon: <ArchiveIcon />, secondary: true },
];

/*
 * Öğrenci menüsü bilerek minimal: günün işi ve geçmiş günler.
 * Planlama, istatistik ve rutinler koçun yüzeyi.
 */
const STUDENT_NAV: NavItem[] = [
  { href: "/ogrenci/bugun", label: "Bugün", icon: <CheckIcon /> },
  { href: "/ogrenci/gecmis", label: "Geçmiş", icon: <ArchiveIcon /> },
  { href: "/ogrenci/denemeler", label: "Denemeler", icon: <ChartIcon /> },
];

/**
 * Kabuğun kipi. `coach-preview`: koç öğrenci ekranını salt okunur
 * önizliyor — menü öğrencininki, rozet "Önizleme", çıkış yerine
 * koç paneline dönüş bağlantısı.
 */
export type ShellRole = "coach" | "student" | "coach-preview";

function navFor(role: ShellRole): NavItem[] {
  return role === "coach" ? COACH_NAV : STUDENT_NAV;
}

const ROLE_BADGE: Record<ShellRole, string> = {
  coach: "Koç",
  student: "Öğrenci",
  "coach-preview": "Önizleme",
};

export function AppShell({
  children,
  role,
}: {
  children: ReactNode;
  role: ShellRole;
}) {
  return (
    /* Zen sağlayıcısı EN DIŞTA: katman tüm kabuğun üstüne biniyor ve
       ona iki farklı yerden giriliyor (odak kartı, hızlı panel). */
    <ZenProvider>
    <div className="flex min-h-dvh flex-col md:flex-row">
      <NavRail role={role} />
      {/* overflow-x-hidden değil min-w-0: geniş içerik kendi kaydırma
          konteynerinde kalsın, sayfayı yana itmesin. */}
      {/* Alt boşluk: sekme çubuğu + iPhone ana ekran çizgisi + hızlı
          panel düğmesine nefes payı. Eskiden düz `pb-16` (64px) idi;
          58px'lik çubuğun üstünde sayfanın son satırı neredeyse
          çubuğa değiyordu. */}
      <main className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-clip pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+2rem)] md:pb-0">
        {children}
      </main>
      {/* Hızlı panel HER sayfada: kullanıcı Planlama'da ay kurarken
          bugünün bir işini işaretlemek isterse, sekme değiştirip geri
          dönmek zorunda kalmasın. Kabuk düzeyinde duruyor çünkü
          hiçbir ekrana ait değil. */}
      {role === "coach" && <QuickPanel />}

      <MobileTabBar role={role} />
    </div>
    </ZenProvider>
  );
}

/** Masaüstü kenar çubuğu. */
function NavRail({ role }: { role: ShellRole }) {
  const pathname = usePathname();
  const nav = navFor(role);

  return (
    <nav
      aria-label="Ana gezinme"
      /*
       * `sticky top-0 h-dvh`: şerit ekranda sabit kalır ve İÇERİK
       * ONUN YANINDAN akar. Cam malzemenin şart koştuğu şey bu —
       * altından hiçbir şey geçmeyen bir yüzeyde blur yalan olurdu.
       *
       * `fixed` DEĞİL: `fixed` şeridi akıştan çıkarır ve `<main>`'e
       * elle `margin-left` vermek gerekirdi. `sticky` flex satırındaki
       * yerini korur, genişlik hesabı kendiliğinden doğru kalır.
       */
      className="glassChrome glassChrome--side sticky top-0 hidden h-dvh w-52 shrink-0 flex-col px-3 py-5 md:flex"
    >
      {/* Marka imzası ana sayfaya döner: kabuk logosunun her yerde
          kabul gören davranışı budur ve "Panel" sekmesiyle aynı hedef
          olması bir tekrar değil — biri gezinme, biri kimliktir. */}
      <div className="mb-6 px-2">
        <BrandMark href="/" className="inline-flex items-center" />
        <RoleBadge role={role} />
      </div>

      <ul className="flex flex-col gap-0.5">
        {nav
          .filter((item) => !item.secondary)
          .map((item) => (
            <li key={item.href}>
              <RailLink item={item} active={isActive(pathname, item.href)} />
            </li>
          ))}
      </ul>

      <div className="mt-auto flex flex-col gap-1 px-1">
        {nav.some((item) => item.secondary) && (
          <ul className="mb-2 flex flex-col gap-0.5 border-b border-[var(--color-line)] pb-2">
            {nav
              .filter((item) => item.secondary)
              .map((item) => (
                <li key={item.href}>
                  <RailLink item={item} active={isActive(pathname, item.href)} small />
                </li>
              ))}
          </ul>
        )}
        {role === "coach" && (
          <Link
            href="/ogrenci/bugun"
            className="flex h-8 items-center rounded-md px-2.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink-2)]"
          >
            Öğrenci gözüyle önizle
          </Link>
        )}
        {role === "coach-preview" ? (
          <Link
            href="/koc/panel"
            className="flex h-8 items-center rounded-md px-2.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink-2)]"
          >
            ← Koç paneline dön
          </Link>
        ) : (
          <SignOutButton />
        )}
      </div>
    </nav>
  );
}

function RailLink({ item, active, small = false }: { item: NavItem; active: boolean; small?: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5",
        small ? "h-8 text-[length:var(--text-sm)]" : "h-9 text-[length:var(--text-base)]",
        "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
        active
          ? "bg-[color-mix(in_oklch,var(--color-accent)_12%,transparent)] font-medium text-[var(--color-ink)]"
          : small
            ? "text-[var(--color-ink-3)] hover:bg-[color-mix(in_oklch,var(--color-ink)_5%,transparent)] hover:text-[var(--color-ink)]"
            : "text-[var(--color-ink-2)] hover:bg-[color-mix(in_oklch,var(--color-ink)_5%,transparent)] hover:text-[var(--color-ink)]",
      )}
    >
      <span
        className={cn(
          "shrink-0 transition-colors duration-[var(--duration-fast)]",
          active ? "text-[var(--color-accent)]" : "text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-2)]",
        )}
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

/**
 * Mobil alt sekme çubuğu.
 *
 * Beş sekme çubuğu eşit bölüşür; kaydırma YOK, hepsi ilk bakışta
 * görünür. Ölçüler ve aritmetik nav-bar.css'te.
 */
function MobileTabBar({ role }: { role: ShellRole }) {
  const pathname = usePathname();
  const nav = navFor(role);
  const primary = nav.filter((item) => !item.secondary);
  const secondary = nav.filter((item) => item.secondary);
  // Açıldığı sayfayı tutar: sayfa değişince "Diğer" kendiliğinden kapanır.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const moreOpen = openOn === pathname;
  const setMoreOpen = (open: boolean) => setOpenOn(open ? pathname : null);
  const moreActive = secondary.some((item) => isActive(pathname, item.href));

  const itemClass = (active: boolean) =>
    cn(
      "tabBarItem",
      "flex flex-col items-center justify-center gap-1 px-0.5 py-2.5",
      "text-[length:var(--text-2xs)]",
      "transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
      "active:scale-[0.97]",
      active
        ? "font-medium text-[var(--color-accent)] [&>svg]:drop-shadow-[0_0_6px_oklch(0.72_0.14_245/0.55)]"
        : "text-[var(--color-ink-3)]",
    );

  return (
    <>
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="fixed inset-0 z-[var(--z-sticky)] bg-black/40 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <ul
            id="tabbar-more"
            className="glassChrome fixed inset-x-3 z-[var(--z-sticky)] flex flex-col gap-0.5 rounded-xl border border-[var(--color-line)] p-2 md:hidden"
            style={{ bottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 0.5rem)" }}
          >
            {secondary.map((item) => (
              <li key={item.href}>
                <RailLink item={item} active={isActive(pathname, item.href)} />
              </li>
            ))}
          </ul>
        </>
      )}
      <nav
        aria-label="Ana gezinme"
        className="tabBar glassChrome glassChrome--bottom flex fixed inset-x-0 bottom-0 z-[var(--z-sticky)] pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primary.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
              {item.icon}
              <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
        {secondary.length > 0 && (
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="tabbar-more"
            onClick={() => setMoreOpen(!moreOpen)}
            className={itemClass(moreActive || moreOpen)}
          >
            <MoreIcon />
            <span className="max-w-full truncate">Diğer</span>
          </button>
        )}
      </nav>
    </>
  );
}

function MoreIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="13" cy="8" r="1.4" />
    </svg>
  );
}

/**
 * Hangi kipte olunduğu — küçük, sessiz bir etiket. Önizleme kipinde
 * vurgu rengini alır: koç salt okunur bir ekranda olduğunu unutmasın.
 */
function RoleBadge({ role }: { role: ShellRole }) {
  return (
    <span
      className={cn(
        "mt-2 inline-flex h-5 items-center rounded-full border px-2 text-[length:var(--text-2xs)] font-medium uppercase tracking-[0.06em]",
        role === "coach-preview"
          ? "border-[color-mix(in_oklch,var(--color-accent)_45%,transparent)] text-[var(--color-accent)]"
          : "border-[var(--color-line)] text-[var(--color-ink-3)]",
      )}
    >
      {ROLE_BADGE[role]}
    </span>
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

/*
 * Kök TAM eşleşme ister, önek değil.
 *
 * `/` öneki her yolu eşleştirir ve Panel sekmesi TÜM sayfalarda aktif
 * görünürdü — aktiflik işareti de hiçbir şey söylemez hâle gelirdi.
 * Bu özel durum bir ara gereksizleşmişti (kök yalnızca yönlendirmeydi
 * ve hiçbir sekme `/` değildi); F8'de kök kontrol paneli olunca geri
 * geldi.
 *
 * Diğer sekmelerde önek DOĞRU olan: `/koc/planlama/hedefler` açıkken Plan
 * sekmesi aktif kalmalı.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

