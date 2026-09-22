"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui/cn";

const TABS = [
  /*
   * Sıra ÖLÇEKTEN ÖLÇEKE gider: rutinler günlük disiplin (her gün
   * işaretlenen), denemeler haftalık ölçüm (arada bir girilen),
   * tablo aylık genel görünüm. Sık bakılan önce.
   */
  { href: "/istatistik", label: "Rutinler" },
  { href: "/istatistik/denemeler", label: "Denemeler" },
  /*
   * Tablo (rutin × gün matrisi) buraya ana sekmeden indi — yeri
   * Arşiv'e verildi (gerekçe `AppShell.tsx`'te). Kendi rotası
   * `/tablo` olarak duruyor; burası ona giden sekme.
   *
   * `/istatistik/tablo` DEĞİL `/tablo`: matris kendi tam genişlikli
   * kaydırıcısını kuruyor ve İstatistik'in `3xl` gövdesine
   * sığmıyor. Sekme başka bir rotaya götürebilir — `aria-current`
   * doğru kaldığı sürece kullanıcı için fark yok.
   */
  { href: "/tablo", label: "Tablo" },
] as const;

/**
 * İstatistik yüzeyinin alt sekmeleri.
 *
 * ── Neden Denemeler ayrı bir ANA sekme değil? ──
 * `AppShell`'in nav kuralı bağlayıcı: "Beş sekme üst sınırdır. Yeni
 * bir yüzey gerektiğinde sekme EKLENMEZ, var olanın içine girer."
 * Deneme "nasıl gidiyorum" sorusudur ve İstatistik tam olarak o
 * sekme — aynı soruyu iki ayrı yerden sormak, kullanıcıyı her
 * seferinde "hangisine bakacaktım" diye düşündürürdü.
 *
 * ── Neden `PlanlamaTabs` yeniden kullanılmıyor? ──
 * O bileşen sorgu dizesi taşıma mantığı içeriyor (çapa, ölçek,
 * kategori filtresi — `usePlanlamaSurface`). Burada taşınacak bir
 * durum yok; o mantığı miras almak, hiçbir şey yapmayan bir kodu
 * ikinci bir yüzeyin bakım borcuna çevirirdi. Görsel dil aynı,
 * mekanizma değil.
 */
export function IstatistikTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="İstatistik görünümleri"
      className="flex gap-1 rounded-lg bg-[var(--color-surface-2)] p-1"
    >
      {TABS.map((tab) => {
        /*
         * `/istatistik` HER yolun öneki olduğu için `startsWith` onu
         * daima aktif gösterirdi — `PlanlamaTabs`'in aynı tuzağı.
         * Kök sekme tam eşleşme ister, alt sekme önek yeter (detay
         * sayfası `/denemeler/[id]` de sekmeyi aktif tutmalı).
         */
        const active =
          tab.href === "/istatistik"
            ? pathname === "/istatistik"
            : pathname.startsWith(tab.href);

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
