/*
 * Marka logosunun sözleşmesi — bileşenden AYRI bir modül.
 *
 * ── Neden ayrı dosya? ──
 * Nöbetçi test (`brandmark.test.ts`) bu değerleri okumak zorunda, ama
 * `BrandMark.tsx` JSX içeriyor ve `next/image` çekiyor. Testin bir
 * React bileşenini içe aktarması, sırf birkaç sabit için tüm o ağacı
 * (ve `next/font` bağlamını) test ortamına taşımak olurdu.
 *
 * Sabitler burada; bileşen de test de aynı yerden okur. Tek gerçek
 * kaynağı olmayan bir bayrak, zaten nöbetçinin engellemeye çalıştığı
 * sürüklenmenin ta kendisi olurdu.
 */

/*
 * ── Neden PNG, SVG DEĞİL? ──
 * Logo bir SVG olarak da geldi ama dosya gerçekte PNG'ydi: uzantısı
 * değiştirilmiş bir kopyaydı (`\x89PNG` imzası, ikisinin md5'i aynı).
 * Tarayıcı `.svg`'yi `image/svg+xml` diye sunar, içerik PNG olduğu
 * için ÇİZİLMEZ — hiçbir derleme hatası vermeden logo kaybolurdu.
 * Sahte uzantı silindi; gerçek vektör kaynağı bulunursa buraya
 * `.svg` yazmak yeterli olacak (bkz. nöbetçi test).
 */
export const BRAND_LOGO_PUBLIC_PATH = "/kero-yks.png";

/**
 * Logo dosyası projeye eklendiğinde `true` yapılır.
 *
 * Yalnız bırakılmaz: `brandmark.test.ts` bunu `public/` içindeki
 * gerçek dosyayla karşılaştırır ve ikisi ayrışırsa testi kırar.
 */
export const HAS_LOGO_FILE = true;

/*
 * Görselin doğal ölçüsü — dosya değişirse BURASI da değişir.
 *
 * Kaynak 1080×1080 kareydi ve logo karenin yalnızca %21'ini
 * dolduruyordu; her kenarda ~280px şeffaf boşluk vardı. Kare kutu
 * olarak yerleştirilseydi `width` boşluğu da sayacağı için logo
 * kenar çubuğunda olması gerekenden çok küçük görünürdü. Şeffaf
 * kenarlar kırpıldı (8px nefes payı bırakıldı) ve dosya 60KB'tan
 * 37KB'a indi.
 */
export const BRAND_LOGO_WIDTH = 543;
export const BRAND_LOGO_HEIGHT = 478;
