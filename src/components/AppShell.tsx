"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  GridIcon,
  ListIcon,
  NoteIcon,
  TargetIcon,
} from "@/components/icons";
import "./nav-bar.css";
import "./glass.css";

interface NavItem {
  href: string;
  label: string;
  /**
   * Alt sekme çubuğu için kısa etiket. Sekmeler 68px sabit genişlikte
   * (bkz. nav-bar.css) ve uzun adlar oraya sığmaz. Kısaltma
   * verilmezse `label` kullanılır.
   */
  shortLabel?: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { href: "/", label: "Tablo", icon: <GridIcon /> },
  { href: "/bugun", label: "Bugün", icon: <CheckIcon /> },
  { href: "/takvim", label: "Takvim", icon: <CalendarIcon /> },
  /*
   * Planlama, Takvim'in HEMEN yanında: ikisi de zamansal yüzeydir ve
   * komşu durmaları haritayı okunur kılar. Takvim BAKMAK içindir
   * (ay/hafta görünümü); Planlama KURMAK içindir — hedef koymak,
   * günü yazmak, kategorilere ayırmak, ay sonunda ölçmek.
   */
  {
    href: "/planlama",
    label: "Planlama",
    // "Plan" DEĞİL diye tam ad: eski /takvim/plan ekranının adı
    // "Plan"dı ve ikisi karışırdı. Kısa etiket yine "Plan" — 68px'e
    // "Planlama" sığmaz ve kısaltma bağlamda belirsiz değil.
    shortLabel: "Plan",
    icon: <TargetIcon />,
  },
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
   * olsalardı çubuk sekize çıkardı — kaydırma sekme genişliğini
   * koruyor ama her yeni sekme "ilk bakışta görünmeyen" alanı
   * büyütür; birleştirme hâlâ doğru karar.
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
                // Vurgu mevcut seçimi bildirir — dekorasyon değil.
                // Yan şerit KULLANILMAZ; ikon aydınlanır ve zemin
                // mürekkebin kendi tonuna kayar.
                //
                // %15 → %10: vurgu kobalttan BEYAZA döndü ve aynı oran
                // artık gözü acıtan bir parlaklık veriyordu. Cam
                // şeridin üstünde okunması için bu kadarı yeterli.
                isActive(pathname, item.href)
                  ? "bg-[color-mix(in_oklch,var(--color-ink)_10%,transparent)] font-medium text-[var(--color-ink)]"
                  : "text-[var(--color-ink-2)] hover:bg-[color-mix(in_oklch,var(--color-ink)_5%,transparent)] hover:text-[var(--color-ink)]",
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

/**
 * Mobil alt sekme çubuğu — yatay kaydırılabilir.
 *
 * Yedi sekme sabit 68px genişlikte durur ve çubuk kayar; sıkıştırma
 * yapılmaz. Gerekçe ve ölçüler nav-bar.css'te.
 */
function MobileTabBar() {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  /*
   * Aktif sekmeyi görünüre getir.
   *
   * `useEffect`, `useLayoutEffect` DEĞİL: layout effect sunucuda uyarı
   * basar ve burada boyamadan önce çalışması gerekmiyor — çubuk
   * ekranın en altında ve ilk karede kaydırılmamış olması fark
   * edilmez.
   *
   * `block: "nearest"` ZORUNLU: varsayılan "start" DİKEY kaydırmayı da
   * tetikler ve sayfayı yukarı zıplatır. `inline: "center"` sekmeyi
   * ortalar. `behavior: "auto"` — kullanıcının yapmadığı bir hareketi
   * ona animasyonla göstermek yanıltıcı olurdu.
   *
   * Hydration uyuşmazlığı imkânsız: DOM'a hiçbir şey yazılmıyor,
   * yalnızca kaydırma konumu değişiyor ve React onu uzlaştırmıyor.
   */
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "auto",
    });
  }, [pathname]);

  return (
    <nav
      aria-label="Ana gezinme"
      /*
       * `pb-[env(safe-area-inset-bottom)]` KAYDIRMA KONTEYNERİNDE
       * kalır. Sekmelere taşımak her sekmeye ayrı boşluk verir ve
       * flex-basis hesabını bozardı; burada iPhone home indicator
       * alanı sekmelerin altında tek parça boş durur.
       *
       * `.tabBar`'a tabindex VERİLMEZ: içindeki yedi <Link> zaten
       * odaklanabilir ve tarayıcı odaklananı kendiliğinden görünüre
       * kaydırır. Ayrı bir odak durağı, klavye kullanıcısına anlamsız
       * bir fazladan Tab bastırırdı.
       */
      className="tabBar glassChrome glassChrome--bottom fixed inset-x-0 bottom-0 z-[var(--z-sticky)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            ref={active ? activeRef : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tabBarItem",
              "flex flex-col items-center justify-center gap-1 px-0.5 py-2.5",
              "text-[length:var(--text-2xs)]",
              "transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
              "active:scale-[0.97]",
              active
                ? "font-medium text-[var(--color-accent)]"
                : "text-[var(--color-ink-3)]",
            )}
          >
            {item.icon}
            <span className="max-w-full truncate">
              {item.shortLabel ?? item.label}
            </span>
          </Link>
        );
      })}
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

