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
   * (Ay → Hafta), sonra hedefler AYNI daralma yönünde
   * (Hedefler = aylık → Haftalık), en sonda geriye bakış (Özet).
   *
   * "Haftalık"ın yeri "Hedefler"in HEMEN SAĞI: ikisi aynı işin iki
   * ölçeğidir ve arasına başka bir şey girseydi, aylıktan haftalığa
   * geçen kullanıcı sekme çubuğunu baştan taramak zorunda kalırdı.
   */
  { href: "/planlama/ay", label: "Ay", filters: true },
  { href: "/planlama/hafta", label: "Hafta", filters: true },
  { href: "/planlama/hedefler", label: "Hedefler", filters: false },
  /*
   * Etiket "Haftalık", "Haftalık hedefler" DEĞİL: beş sekmenin
   * `max-w-2xl` kutuya sığması gerekiyor ve iki kelimelik bir etiket
   * dar ekranda satırı taşırırdı. Başlığın tam adı ekranın içinde
   * duruyor (SectionHeading → "Haftalık hedefler").
   *
   * Yalnız "Hafta" da OLAMAZDI: soldaki ızgara sekmesiyle birebir aynı
   * kelime olurdu ve ikisi farklı işler yapıyor.
   */
  { href: "/planlama/haftalik", label: "Haftalık", filters: false },
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
 * Ölçüt SEKME SAYISI DEĞİL KULLANIM SIKLIĞIDIR. "Haftalık" beşinci
 * sekme olarak duruyor çünkü hafta başında hedef yazmak Hedefler kadar
 * sık bir iştir; kategori yönetimi o eşiği geçmiyor. Sekme çubuğu bu
 * kadarını taşır, ama her yeni sekme aynı soruyu yeniden sormalı: bu iş
 * ayda bir yapılıyor mu, yılda bir mi?
 *
 * (Beşinci sekme önce "Genel"di — aya bağlı serbest not. Yazılıyor ama
 * ölçülmüyordu, yani üzerine bir şey yapılamıyordu; yerini sayaçlı ve
 * tamamlanabilir haftalık hedefler aldı. Tablo 0012'de düşürüldü.)
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
     * Dolgu ve boşluk BEŞİNCİ sekme için iki kez daraltıldı:
     * gap-1 → gap-0.5 ve px-3 → px-2.5 ("Genel" eklenirken), sonra
     * px-2.5 → px-2 ("Genel" → "Haftalık" olurken; etiket 3 harf uzadı).
     *
     * Ölçüm (e2e/tabfit-check.mjs, gerçek CSS ile):
     *   px-2.5 → 293px gerekiyor; 320px kutuda 5px taşma
     *   px-2   → 288px gerekiyor; 320px'de TAM sığar, 375px'te rahat
     *
     * 288px'te px-2 hâlâ 17px taşar ve bu KABUL EDİLDİ: 288 en dar test
     * kutusudur, üretimdeki en dar cihaz 320px. Oraya kadar inmek
     * px-1.5 gerektiriyordu ve o da "Ay" sekmesinin dokunma hedefini
     * 28px'e düşürüyordu — WCAG'ın 24px asgarisinin hemen üstü.
     *
     * Reddedilen alternatifler:
     *   `overflow-x-auto` — kaydırılan sekme çubuğu, kaydırıldığında
     *     ilk sekmeyi GİZLER; gezinme haritasının yarısı görünmez olur.
     *   "Haftalık" → "H.Hedef" — ÖLÇÜLDÜ, işe yaramıyor: nokta ve iki
     *     büyük harf yüzünden 72px, yani "Haftalık"tan (70px) DAHA
     *     geniş. Kısaltma her zaman daraltmaz.
     *   "Hedefler" → "Aylık" — sığıyor (269px) ama çubukta "Ay" ile
     *     "Aylık", "Hafta" ile "Haftalık" yan yana gelir ve dört
     *     sekmenin ikisi birbirine karışır.
     *
     * Dokunma hedefi korunur: `py-1.5` + satır yüksekliği ≈ 32px ve
     * en dar sekme ("Ay") 32px kalır.
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
              "rounded-md px-2 py-1.5 text-[length:var(--text-sm)]",
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
