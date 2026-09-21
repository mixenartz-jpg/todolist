"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/ui/cn";

const TABS = [
  /*
   * `filters` — bu sekme kategori filtresini KULLANIYOR mu?
   *
   * Takvim yüzeyi süzülebilir; Hedefler ve Özet ayın tamamını okur.
   * Filtre parametresi onlara da taşınsaydı, adres çubuğunda hiçbir
   * etkisi olmayan bir `?kat=` durur ve kullanıcı "neden süzülmüyor"
   * diye sorardı.
   *
   * Sıra YAPMAKTAN ÖLÇMEYE gider: takvim (günleri kur) → hedefler
   * (neyi hedefliyorum) → özet (nasıl gitti).
   */
  { href: "/planlama", label: "Plan", filters: true },
  { href: "/planlama/hedefler", label: "Hedefler", filters: false },
  { href: "/planlama/ozet", label: "Özet", filters: false },
] as const;

/** Kategori filtresinin sorgu parametresi (usePlanlamaSurface ile aynı). */
const CATEGORY_PARAM = "kat";

/**
 * Planlamanın alt sekmeleri.
 *
 * ── Beş sekmeden üçe ──
 * Önce Ay · Hafta · Hedefler · Haftalık · Özet vardı. İkisi kalktı:
 *
 *   · **Ay ve Hafta birleşti.** İkisi ayrı EKRAN değil, aynı ekranın
 *     iki ölçeğiydi — aynı satırı, aynı davranışla çiziyorlardı. Şimdi
 *     `/planlama` içinde bir ölçek düğmesi (bkz. PlanScaleToggle).
 *     Sekme "başka bir yere git" der; ölçek "aynı yere başka ölçekte
 *     bak" — ikisi farklı şeyler ve aynı çubuğa konmamalıydı.
 *
 *   · **Haftalık, Hedefler'in içine girdi.** Ayrı sekme olması aylık
 *     ve haftalık hedefleri birbirinden habersiz iki liste yapıyordu:
 *     0014'ün kurduğu `plan_goal_id` bağı (haftalık hedef = aylık
 *     hedefin dilimi) hiçbir Planlama ekranında GÖRÜNMÜYORDU. İç içe
 *     gösterince bağ görünür oldu ve bir sekme de eksildi.
 *
 * ── Kategoriler neden AYRI sekme değil? ──
 * Kategori yönetimi (oluştur, adlandır, renk, arşivle) yılda birkaç
 * kez yapılan bir iştir; ayrı bir sekme ona hedeflerle eşit ağırlık
 * verirdi. Yeri Özet sekmesindeki dağılımın altıdır — kullanıcı
 * kategorilerine zaten oraya bakarken karar verir.
 *
 * Ölçüt SEKME SAYISI DEĞİL KULLANIM SIKLIĞIDIR: bu iş ayda bir mi
 * yapılıyor, yılda bir mi?
 */
export function PlanlamaTabs() {
  const pathname = usePathname();

  /*
   * Sorgu dizesi sekmeler arasında TAŞINIR. Çapa (`?t=`), ölçek
   * (`?ol=`) ve kategori filtresi orada yaşıyor (bkz.
   * usePlanlamaSurface); düz `href` ile geçilseydi "Eylül'e
   * bakıyordum, Hedefler dedim, döndüm ve bu aya atladım" olurdu.
   */
  const params = useSearchParams();

  /*
   * Filtreyi kullanmayan sekmeye `kat` GÖTÜRÜLMEZ ama URL'den
   * silinmez de: kullanıcı Özet'ten Plan'a döndüğünde filtresi geri
   * gelsin diye Plan bağlantısı onu taşımaya devam eder. Kaybolması,
   * "Matematik'e süzmüştüm, Özet'e bakıp döndüm, gitti" demek olurdu.
   */
  function hrefFor(tab: (typeof TABS)[number]): string {
    const next = new URLSearchParams(params.toString());
    if (!tab.filters) next.delete(CATEGORY_PARAM);

    const query = next.toString();
    return query.length > 0 ? `${tab.href}?${query}` : tab.href;
  }

  /*
   * Aktiflik: `/planlama` HER yolun öneki olduğu için `startsWith`
   * onu daima aktif gösterirdi. Takvim sekmesi tam eşleşme ister,
   * diğerleri önek yeter (alt rota yok ama sorgu dizesi var ve o
   * `pathname`'e girmiyor).
   */
  function isActive(tab: (typeof TABS)[number]): boolean {
    return tab.href === "/planlama"
      ? pathname === "/planlama"
      : pathname.startsWith(tab.href);
  }

  return (
    /*
     * Dolgu BEŞ sekme için iki kez daraltılmıştı (gap-1 → gap-0.5,
     * px-3 → px-2). Üç sekmede o baskı kalktı ve ölçüler geri açıldı:
     * `e2e/tabfit-check.mjs` üç sekmeyi 288px'te bile rahat sığdırıyor.
     *
     * Dokunma hedefi: `py-1.5` + satır yüksekliği ≈ 32px, en dar sekme
     * ("Plan") ~50px — WCAG 2.2 asgarisinin (24px) üstünde.
     */
    <nav
      aria-label="Planlama görünümleri"
      className="flex gap-1 rounded-lg bg-[var(--color-surface-2)] p-1"
    >
      {TABS.map((tab) => {
        const active = isActive(tab);

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
