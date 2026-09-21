import Image from "next/image";
import Link from "next/link";
import {
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_PUBLIC_PATH,
  BRAND_LOGO_WIDTH,
  HAS_LOGO_FILE,
} from "./brandmark.config";

/*
 * Kero YKS marka imzası.
 *
 * ── Neden bileşen, doğrudan <Image> değil? ──
 * Marka üç yerde görünür (masaüstü kenar çubuğu, mobil başlık, giriş
 * ekranı) ve üçünde de aynı erişilebilirlik sözleşmesini taşımak
 * zorunda: tek bir ad, tek bir bağlantı hedefi, tek bir ölçü kaynağı.
 * Üç kopya, üçüncüsü unutulduğunda sessizce ayrışırdı.
 *
 * ── Neden görsel YOKSA yazıya düşüyor? ──
 * Logo dosyası projeye sonradan eklenecek. `next/image` var olmayan
 * bir kaynakta çalışma anında 404 verir ve kabuk logosuz kalırdı —
 * her sayfada görünen bir boşluk. Yazı yedeği el yazısı fontla
 * (`font-hand`) çizilir; logo geldiğinde tek satır sabit değişir ve
 * yedek kendiliğinden devreden çıkar.
 *
 * ── Neden sabitler ayrı modülde? ──
 * `brandmark.config.ts`'te, çünkü nöbetçi test (`brandmark.test.ts`)
 * bayrağı `public/` içindeki gerçek dosyayla karşılaştırıyor ve bunun
 * için bir React bileşenini içe aktarması gerekmemeli.
 *
 * ── Neden ölçü SABİT? ──
 * `width`/`height` verilmeden yerleştirilen görsel yüklenirken satırı
 * zıplatır (CLS). Kabuk logosu her sayfada ilk boyada görünür; orada
 * bir zıplama tüm uygulamayı "yavaş" hissettirir.
 */

interface BrandMarkProps {
  /**
   * Bağlantı olsun mu. Kenar çubuğunda evet (ana sayfaya dönüş),
   * giriş ekranında hayır — orada gidilecek bir yer yok ve boş bir
   * bağlantı klavye kullanıcısına anlamsız bir durak olurdu.
   */
  href?: string;
  /** Ölçek çarpanı; mobil başlıkta biraz küçülür. */
  scale?: number;
  className?: string;
}

export function BrandMark({ href, scale = 1, className }: BrandMarkProps) {
  const inner = HAS_LOGO_FILE ? (
    <Image
      src={BRAND_LOGO_PUBLIC_PATH}
      alt="Kero YKS"
      width={Math.round(BRAND_LOGO_WIDTH * scale)}
      height={Math.round(BRAND_LOGO_HEIGHT * scale)}
      /* Kabuk logosu her sayfada ilk ekranda: tembel yükleme onu
         görünür alanda geciktirirdi. */
      priority
    />
  ) : (
    /*
     * Yazı yedeği. `aria-label` YOK: metnin kendisi zaten okunuyor,
     * etiket eklemek ekran okuyucuda çift okumaya yol açardı.
     *
     * Turuncu, logonun kendi rengi — `--color-accent` (oklch 0.7 0.19 48)
     * gönderilen logonun turuncusuyla aynı aileden. Metin normalde
     * beyaz kalır (bkz. globals.css mürekkep kuralı); marka imzası
     * bunun bilinçli tek istisnasıdır ve 7.01:1 ile eşiği aşar.
     */
    <span
      className="font-hand font-bold leading-none text-[var(--color-accent)]"
      style={{ fontSize: `${1.75 * scale}rem` }}
    >
      Kero YKS
    </span>
  );

  if (href === undefined) {
    return <span className={className}>{inner}</span>;
  }

  return (
    <Link
      href={href}
      aria-label="Kero YKS — ana sayfa"
      className={className}
    >
      {inner}
    </Link>
  );
}
