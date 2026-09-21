"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { createClient } from "@/lib/supabase/client";
import {
  ChartIcon,
  CheckIcon,
  GridIcon,
  HomeIcon,
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
const NAV: NavItem[] = [
  /*
   * Panel AÇILIŞ ekranı ve sekmelerin başında duruyor: "neyin nerede
   * olduğu" sorusunun cevabı, günün işine girmeden ÖNCE gelir.
   */
  { href: "/", label: "Panel", icon: <HomeIcon /> },
  { href: "/bugun", label: "Bugün", icon: <CheckIcon /> },
  {
    href: "/planlama",
    label: "Planlama",
    // Kısa etiket "Plan": 64px'e "Planlama" sığmaz ve kısaltma
    // bağlamda belirsiz değil.
    shortLabel: "Plan",
    icon: <TargetIcon />,
  },
  /*
   * Tablo (rutin × gün matrisi) eskiden `/` idi ve açılış ekranıydı.
   * Koçluk ürününde açılış "şimdi ne yapmalıyım" sorusunu cevaplar,
   * "bu ay nasıl gidiyorum"u değil — o geriye bakmaktır ve sekmede
   * İstatistik'in komşusu olarak doğru yerde durur.
   */
  { href: "/tablo", label: "Tablo", icon: <GridIcon /> },
  {
    href: "/istatistik",
    label: "İstatistik",
    // "İstatistik" yerine "Durum" DEĞİL: sekme adı içeriğini
    // söylemeli. Kısaltma aynı kelimenin yaygın kısa biçimidir.
    shortLabel: "İstat.",
    icon: <ChartIcon />,
  },
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
                // vurgunun kendi tonuna kayar.
                //
                // Zemin oranı %10 → %12: vurgu beyazdan turuncuya
                // döndü ve turuncunun %10'u koyu yüzeyde beyazınki
                // kadar okunmuyordu. Metin İNK kalır (turuncu metin
                // okunabilirliği düşürürdü); rengi ikon taşır.
                isActive(pathname, item.href)
                  ? "bg-[color-mix(in_oklch,var(--color-accent)_12%,transparent)] font-medium text-[var(--color-ink)]"
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
 * Mobil alt sekme çubuğu.
 *
 * Beş sekme çubuğu eşit bölüşür; kaydırma YOK, hepsi ilk bakışta
 * görünür. Ölçüler ve aritmetik nav-bar.css'te.
 */
function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Ana gezinme"
      /*
       * `pb-[env(safe-area-inset-bottom)]` KAYDIRMA KONTEYNERİNDE
       * kalır. Sekmelere taşımak her sekmeye ayrı boşluk verir ve
       * flex-basis hesabını bozardı; burada iPhone home indicator
       * alanı sekmelerin altında tek parça boş durur.
       *
       * `.tabBar`'a tabindex VERİLMEZ: içindeki beş <Link> zaten
       * odaklanabilir. Ayrı bir odak durağı, klavye kullanıcısına
       * anlamsız bir fazladan Tab bastırırdı.
       */
      className="tabBar glassChrome glassChrome--bottom fixed inset-x-0 bottom-0 z-[var(--z-sticky)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tabBarItem",
              "flex flex-col items-center justify-center gap-1 px-0.5 py-2.5",
              "text-[length:var(--text-2xs)]",
              "transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
              "active:scale-[0.97]",
              // Aktif sekme ışır — "buradasın"ın dört meşru
              // ışıma yerinden biri (bkz. globals.css glow bloğu).
              // İkon ve etiket turuncuya döner, ışıma ikonun
              // arkasından gelir.
              active
                ? "font-medium text-[var(--color-accent)] [&>svg]:drop-shadow-[0_0_6px_oklch(0.7_0.19_48/0.55)]"
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

/*
 * Kök TAM eşleşme ister, önek değil.
 *
 * `/` öneki her yolu eşleştirir ve Panel sekmesi TÜM sayfalarda aktif
 * görünürdü — aktiflik işareti de hiçbir şey söylemez hâle gelirdi.
 * Bu özel durum bir ara gereksizleşmişti (kök yalnızca yönlendirmeydi
 * ve hiçbir sekme `/` değildi); F8'de kök kontrol paneli olunca geri
 * geldi.
 *
 * Diğer sekmelerde önek DOĞRU olan: `/planlama/hedefler` açıkken Plan
 * sekmesi aktif kalmalı.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

