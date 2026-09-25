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
  /**
   * Çizim YÜKSEKLİĞİ, piksel. Genişlik orandan türer.
   *
   * ── Neden yükseklik, ölçek çarpanı DEĞİL? ──
   * Çarpan kaynağın ölçüsüne bağlıdır: logo 1080px kareyken `scale=1`
   * bambaşka bir şey, kırpıldıktan sonra bambaşka bir şey çizerdi ve
   * her kaynak güncellemesinde tüm çağrı yerleri sessizce bozulurdu.
   * Yükseklik ise yerleşimin gerçekten umursadığı ölçü: kenar çubuğu
   * satırı da mobil başlık da "kaç piksel yer kaplayacak" diye sorar.
   */
  height?: number;
  className?: string;
}

/** Kaynak dosyanın en/boy oranı — genişlik bundan türer. */
const LOGO_RATIO = BRAND_LOGO_WIDTH / BRAND_LOGO_HEIGHT;

/*
 * Varsayılan çizim yüksekliği — kenar çubuğu ölçüsü.
 *
 * Üç boy ekranda karşılaştırıldı: 30px'te logo okunmuyor (iki satırlı
 * el yazısı o boyda eziliyor ve "Yks" satırı lekeye dönüşüyor), 38px
 * sınırda, 46px hem okunur hem sekme listesini ezmiyor. Tek satırlık
 * bir kelime logosu olsaydı 30px yeterdi; ölçüyü belirleyen şey
 * markanın İKİ SATIR olması.
 */
const DEFAULT_HEIGHT = 46;

export function BrandMark({
  href,
  height = DEFAULT_HEIGHT,
  className,
}: BrandMarkProps) {
  const inner = HAS_LOGO_FILE ? (
    <Image
      src={BRAND_LOGO_PUBLIC_PATH}
      alt="Kero YKS"
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      /* Kabuk logosu her sayfada ilk ekranda: tembel yükleme onu
         görünür alanda geciktirirdi. */
      priority
      /*
       * ── Neden `quality` yükseltildi, `sizes` YOK? ──
       * El yazısı çizgileri ince; JPEG/WebP bozulması onları "soluk"
       * gösteriyor ve kalınlıkları zaten narin olduğu için kayıp
       * doğrudan görünür.
       *
       * `sizes` bilerek verilmedi: verilince `next/image` onu bir
       * duyarlı genişlik ipucu sayıp en büyük breakpoint'i (3840px)
       * seçiyor — 543px'lik bir kaynak için anlamsız bir istek.
       * `sizes` olmadan `width`/`height`'tan 1x ve 2x'i kendisi
       * türetir ve doğru olanı budur.
       */
      quality={90}
    />
  ) : (
    /*
     * Yazı yedeği. `aria-label` YOK: metnin kendisi zaten okunuyor,
     * etiket eklemek ekran okuyucuda çift okumaya yol açardı.
     *
     * Beyaz (`--color-ink`) — logo görselinin kendisi de beyaz; yedek
     * yazı onunla aynı rengi taşımazsa logo yüklenemediğinde marka
     * başka bir renkte görünürdü.
     */
    <span
      className="font-hand font-bold leading-none text-[var(--color-ink)]"
      /* Yedek, logonun çizileceği yüksekliğe yaklaşır: el yazısı
         gövdesi punto değerinin ~%80'i kadar yer kaplar. */
      style={{ fontSize: `${Math.round(height * 0.8)}px` }}
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
