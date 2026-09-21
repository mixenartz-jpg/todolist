import type { Metadata, Viewport } from "next";
import { Caveat, Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  // latin-ext Türkçe karakterler için gerekli: ğ, ş, ı, İ, ç, ö, ü
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

/*
 * Marka aksanı — Kero YKS'nin el yazısı sesi.
 *
 * ── Neden logodan AYRI bir font? ──
 * Logo sabit bir görseldir; deneme adı, karşılama satırı ve koç
 * cümlesi ise dinamik metindir ve görselle yazılamaz. Aynı el yazısını
 * hem SVG hem font olarak taşımak ikinci bir ağ isteği ve ikisinin
 * birbirini tutmama riski demekti; logo kendi çizimini korur, font
 * onun akrabası olur — ikizi değil.
 *
 * ── Neden her yerde DEĞİL? ──
 * El yazısı okunabilirliği düşürür ve sayı hizalaması yoktur. Gövde,
 * başlık ve TÜM sayılar Inter kalır (bkz. globals.css `--font-sans`).
 * Caveat yalnızca marka anlarında görünür: logo komşuluğu, deneme adı,
 * koç cümlesi. Beşinci bir yere eklemek onu dekorasyona çevirir —
 * ışıma (glow) token'ıyla aynı disiplin.
 *
 * ── latin-ext ŞART ──
 * Türkçe glifler (ı İ ş Ş ğ Ğ) latin altkümesinde YOK. Caveat'ın
 * cmap tablosu onikisinin de mevcut olduğu doğrulandı; altküme
 * verilmezse "Şubat" → "ubat" gibi sessiz kırpılmalar olurdu.
 */
const caveat = Caveat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-caveat",
  display: "swap",
  /*
   * Yalnız 700: bugün her kullanım yeri (`BrandMark`, giriş başlığı)
   * `font-bold` uyguluyor. 500 ve 600 indirilseydi iki statik ağırlık
   * boşuna ağ trafiği olurdu — el yazısı ağırlıkları ince farklarla
   * ayrışır ve "ileride lazım olur" diye taşımak ölçülebilir bir
   * bedel. Daha hafif bir kullanım doğduğunda BURAYA eklenir.
   */
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Kero YKS",
  description: "Sınav hazırlığı için kişisel koçluk paneli — plan, hedef, deneme ve yanlış takibi",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kero YKS",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  /* `--color-bg` ile aynı değer; `manifest.ts` ile birlikte değişir.
   * `statusBarStyle: "black-translucent"` (yukarıda) ilk kez gerçekten
   * doğru: durum çubuğu artık altındaki cam kabuğun üstünde duruyor. */
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
