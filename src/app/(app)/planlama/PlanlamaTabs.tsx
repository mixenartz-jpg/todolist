"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/ui/cn";

const TABS = [
  /*
   * `filters` — bu sekme kategori filtresini KULLANIYOR mu?
   *
   * Ay ve Hafta ızgaraları süzülebilir; Hedefler ve Özet ayın
   * tamamını okur. Filtre parametresi onlara da taşınsaydı, adres
   * çubuğunda hiçbir etkisi olmayan bir `?kat=` durur ve kullanıcı
   * "neden süzülmüyor" diye sorardı.
   */
  { href: "/planlama/ay", label: "Ay", filters: true },
  { href: "/planlama/hafta", label: "Hafta", filters: true },
  { href: "/planlama/hedefler", label: "Hedefler", filters: false },
  { href: "/planlama/ozet", label: "Özet", filters: false },
] as const;

/** Kategori filtresinin sorgu parametresi (usePlanlamaSurface ile aynı). */
const CATEGORY_PARAM = "kat";

/**
 * Planlamanın alt sekmeleri.
 *
 * ── Ay ve Hafta neden ÖLÇEK DÜĞMESİ değil, ayrı rota? ──
 * Eski `PlanScaleTabs` ölçeği React state'inde tutuyordu ve URL'e
 * yansımıyordu: kullanıcı "Ağustos planım" sayfasını yer imine
 * ekleyemiyor, geri tuşu ölçeği geri almıyordu. Takvim'de Ay/Hafta
 * zaten ayrı rotalar; Planlama'nın da aynı dili konuşması tutarlılık.
 *
 * ── Kategoriler neden BEŞİNCİ sekme değil? ──
 * Kategori yönetimi (oluştur, adlandır, renk, arşivle) yılda birkaç
 * kez yapılan bir iştir; ayrı bir sekme ona hedeflerle eşit ağırlık
 * verirdi. Yeri Özet sekmesindeki dağılımın altıdır — kullanıcı
 * kategorilerine zaten oraya bakarken karar verir.
 */
export function PlanlamaTabs() {
  const pathname = usePathname();

  /*
   * Sorgu dizesi sekmeler arasında TAŞINIR. Anchor (`?ay=`) ve
   * kategori filtresi orada yaşıyor (bkz. usePlanlamaSurface); düz
   * `href` ile geçilseydi "Eylül'e bakıyordum, Hafta dedim, Ağustos'a
   * döndüm" olurdu. Ölçek değişince çapanın hangi güne oturacağını
   * `anchorForScale` hedef ekranda hesaplar.
   */
  const params = useSearchParams();

  /*
   * Filtreyi kullanmayan sekmeye `kat` GÖTÜRÜLMEZ ama URL'den
   * silinmez de: kullanıcı Özet'ten Ay'a döndüğünde filtresi geri
   * gelsin diye Ay/Hafta bağlantıları onu taşımaya devam eder.
   * Kaybolması, "Matematik'e süzmüştüm, Özet'e bakıp döndüm, gitti"
   * demek olurdu.
   */
  function hrefFor(tab: (typeof TABS)[number]): string {
    const next = new URLSearchParams(params.toString());
    if (!tab.filters) next.delete(CATEGORY_PARAM);

    const query = next.toString();
    return query.length > 0 ? `${tab.href}?${query}` : tab.href;
  }

  return (
    <nav
      aria-label="Planlama görünümleri"
      className="flex gap-1 rounded-lg bg-[var(--color-surface-2)] p-1"
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={hrefFor(tab)}
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
