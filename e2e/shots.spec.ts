import { test, expect } from "@playwright/test";
import {
  preparePage,
  assertTokensPresent,
  REQUIRED_TOKENS,
  SHOT_DIR,
  VIEWPORTS,
  type ViewportName,
} from "./shot";

/*
 * Oturum gerektiren rotaların görsel çekimi.
 *
 * Bu dosya bir DAVRANIŞ testi değil: amacı revizyon öncesi/sonrası
 * yan yana konabilecek görüntü üretmek. Tek gerçek assert'i token
 * kanaryası — o da görsel olarak fark edilmeyen ama her şeyi bozan
 * bir hata modunu (tree-shaking) yakalıyor.
 *
 * Revizyon bittiğinde `page.screenshot()` çağrıları
 * `expect(page).toHaveScreenshot()`'a çevrilir ve harness kalıcı
 * regresyon ağı olur.
 */

interface Route {
  /** Dosya adı — kısa ve sıralanabilir. */
  slug: string;
  path: string;
  /** Bu rotanın çekileceği ölçüler. */
  viewports: readonly ViewportName[];
}

const ALL: readonly ViewportName[] = ["mobile", "tablet", "desktop"];

/*
 * Silinen rotaların numaraları BOŞ BIRAKILDI (03, 04, 05, 06, 07b,
 * 11, 12): kaydırmak kalan her rotanın slug'ını değiştirir ve
 * `e2e/__shots__` altındaki referansları yetim bırakırdı. Numara
 * okuma kolaylığı içindir, kimlik değil.
 *
 * Silinenler ve gerekçeleri:
 *   03, 04     — Defter (Notlar + Yanlışlar), F1'de kaldırıldı
 *   05, 06     — /planlama/ay ve /hafta, F5'te tek /planlama oldu
 *   07b        — /planlama/haftalik, Hedefler içine taşındı
 *   11, 12     — Takvim (Ay + Hafta), F2'de kaldırıldı
 *
 * Eklenenler: 00-panel (F8), 13-arsiv (F12). "00" başta duruyor
 * çünkü Panel artık açılış ekranı.
 */
const ROUTES: readonly Route[] = [
  /*
   * Panel `narrow` (320px) ölçüsünde de çekiliyor: hafta şeridi yedi
   * sütunu o genişliğe sığdırmak zorunda ve taşma SESSİZ olurdu.
   */
  { slug: "00-panel", path: "/", viewports: [...ALL, "narrow"] },
  { slug: "01-tablo", path: "/tablo", viewports: ALL },
  { slug: "02-bugun", path: "/bugun", viewports: ALL },
  { slug: "05-planlama", path: "/planlama", viewports: ALL },
  { slug: "07-planlama-hedefler", path: "/planlama/hedefler", viewports: ALL },
  { slug: "08-planlama-ozet", path: "/planlama/ozet", viewports: ALL },
  { slug: "09-istatistik", path: "/istatistik", viewports: ALL },
  { slug: "10-rutinler", path: "/rutinler", viewports: ALL },
  { slug: "13-arsiv", path: "/arsiv", viewports: ALL },
];

for (const route of ROUTES) {
  for (const viewport of route.viewports) {
    test(`${route.slug} @ ${viewport}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[viewport]);
      await preparePage(page, route.path);

      const missing = await assertTokensPresent(page, REQUIRED_TOKENS);
      expect(missing, `CSS token'ları eksik: ${missing.join(", ")}`).toEqual([]);

      await page.screenshot({
        path: `${SHOT_DIR}/${route.slug}--${viewport}.png`,
        fullPage: true,
      });
    });
  }
}

/*
 * Planlama ay ölçeği 1280px'de ayrı bir yükseklik kuralına giriyor
 * (`planlama.css` `@media (min-width: 1280px)`). Revizyon sonrası
 * havuz da bu kırılmada yana dönecek — kendi çekimini hak ediyor.
 */
test("05-planlama-ay @ wide", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await preparePage(page, "/planlama");
  await page.screenshot({
    path: `${SHOT_DIR}/05-planlama--wide.png`,
    fullPage: true,
  });
});

/* Yönlendirme stub'ları — görüntü değil, hedef doğrulanır. */
test("yönlendirmeler", async ({ page }) => {
  for (const [from, to] of [
    /*
     * Kök ARTIK YÖNLENDİRMİYOR — F8'de kontrol paneli oldu. Onun
     * yerine eski ölçek rotaları tek `/planlama` yüzeyine düşüyor.
     */
    ["/planlama/ay", "/planlama"],
    /*
     * Hafta ölçeği çapayı KORUYARAK geçiyor: `?ol=hafta` düşseydi
     * kullanıcı hafta görünümünü yer imine eklediğinde ay
     * görünümünde açılırdı. Bu yüzden desen `$` ile bitmiyor.
     */
    ["/planlama/hafta", "/planlama\?ol=hafta"],
    ["/planlama/haftalik", "/planlama/hedefler"],
    /* Takvim sekmesi kaldırıldı ama adresler yer imlerinde olabilir;
       PWA'da 404 çıkmaz sokaktır. */
    ["/takvim", "/planlama"],
    ["/takvim/plan", "/planlama"],
  ]) {
    await page.goto(from);
    /*
     * `$` YOK: bazı yönlendirmeler sorgu parametresi taşıyor
     * (bkz. /planlama/hafta) ve sona sabitlemek onları yanlışlıkla
     * başarısız gösterirdi.
     */
    await expect(page).toHaveURL(new RegExp(to));
  }
});
