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
  /*
   * Sıra ZAMANSAL DARALMADAN SOYUTLAMAYA gider: önce ızgaralar
   * (Ay → Hafta), sonra ay ölçeğinde yazı (Hedefler → Genel), en sonda
   * geriye bakış (Özet). "Genel"i sona koymak, ay bittikten sonra
   * okunan Özet'i ortaya sıkıştırırdı.
   */
  { href: "/planlama/ay", label: "Ay", filters: true },
  { href: "/planlama/hafta", label: "Hafta", filters: true },
  { href: "/planlama/hedefler", label: "Hedefler", filters: false },
  /*
   * Etiket "Genel", "Genel planlama" DEĞİL: beş sekmenin `max-w-2xl`
   * kutuya sığması gerekiyor ve iki kelimelik bir etiket dar ekranda
   * satırı taşırırdı. Başlığın tam adı ekranın içinde duruyor
   * (SectionHeading → "Genel planlama").
   */
  { href: "/planlama/genel", label: "Genel", filters: false },
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
 * ── Kategoriler neden AYRI sekme değil? ──
 * Kategori yönetimi (oluştur, adlandır, renk, arşivle) yılda birkaç
 * kez yapılan bir iştir; ayrı bir sekme ona hedeflerle eşit ağırlık
 * verirdi. Yeri Özet sekmesindeki dağılımın altıdır — kullanıcı
 * kategorilerine zaten oraya bakarken karar verir.
 *
 * Ölçüt SEKME SAYISI DEĞİL KULLANIM SIKLIĞIDIR. "Genel" beşinci sekme
 * olarak eklendi çünkü ay ölçeğinde not almak Hedefler kadar sık bir
 * iştir; kategori yönetimi o eşiği geçmiyor. Sekme çubuğu bu kadarını
 * taşır, ama her yeni sekme aynı soruyu yeniden sormalı: bu iş ayda
 * bir yapılıyor mu, yılda bir mi?
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
    /*
     * Dolgu ve boşluk BEŞİNCİ sekme için daraltıldı (gap-1 → gap-0.5,
     * px-3 → px-2.5). Ölçümle: dört sekme 320px'de rahat sığıyordu ama
     * beşi 288px'lik kutuda 307px istiyordu — 19px taşma. Daraltma
     * gerekliyi 288'in altına indirir ve 320'de de sığar.
     *
     * Reddedilen alternatifler:
     *   `overflow-x-auto` — kaydırılan sekme çubuğu, kaydırıldığında
     *     ilk sekmeyi GİZLER; gezinme haritasının yarısı görünmez olur.
     *   "Hafta" → "Hft." — en geniş sekme "Hedefler" (77px), yani
     *     kısaltma yanlış yeri hedefler ve okunabilirliği boşuna bozar.
     *
     * Dokunma hedefi korunur: `py-1.5` + satır yüksekliği ≈ 32px ve
     * en dar sekme ("Ay") 35px kalır.
     */
    <nav
      aria-label="Planlama görünümleri"
      className="flex gap-0.5 rounded-lg bg-[var(--color-surface-2)] p-1"
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={hrefFor(tab)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-[length:var(--text-sm)]",
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
