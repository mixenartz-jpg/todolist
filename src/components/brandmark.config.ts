/*
 * Marka logosunun sözleşmesi — bileşenden AYRI bir modül.
 *
 * ── Neden ayrı dosya? ──
 * Nöbetçi test (`brandmark.test.ts`) bu değerleri okumak zorunda, ama
 * `BrandMark.tsx` JSX içeriyor ve `next/image` çekiyor. Testin bir
 * React bileşenini içe aktarması, sırf iki sabit için tüm o ağacı
 * (ve `next/font` bağlamını) test ortamına taşımak olurdu.
 *
 * Sabitler burada; bileşen de test de aynı yerden okur. Tek gerçek
 * kaynağı olmayan bir bayrak, zaten nöbetçinin engellemeye çalıştığı
 * sürüklenmenin ta kendisi olurdu.
 */

/** `public/` köküne göre logo yolu. */
export const BRAND_LOGO_PUBLIC_PATH = "/kero-yks.svg";

/**
 * Logo dosyası projeye eklendiğinde `true` yapılır.
 *
 * Yalnız bırakılmaz: `brandmark.test.ts` bunu `public/` içindeki
 * gerçek dosyayla karşılaştırır ve ikisi ayrışırsa testi kırar.
 */
export const HAS_LOGO_FILE = false;

/** Görselin doğal oranı — dosya değişirse BURASI da değişir. */
export const BRAND_LOGO_WIDTH = 104;
export const BRAND_LOGO_HEIGHT = 40;
