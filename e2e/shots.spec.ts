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

const ROUTES: readonly Route[] = [
  { slug: "01-tablo", path: "/", viewports: ALL },
  { slug: "02-bugun", path: "/bugun", viewports: ALL },
  { slug: "03-takvim-ay", path: "/takvim/ay", viewports: ALL },
  { slug: "04-takvim-hafta", path: "/takvim/hafta", viewports: ALL },
  { slug: "05-planlama-ay", path: "/planlama/ay", viewports: ALL },
  { slug: "06-planlama-hafta", path: "/planlama/hafta", viewports: ALL },
  { slug: "07-planlama-hedefler", path: "/planlama/hedefler", viewports: ALL },
  /*
   * Slug "07b": sekme sırasında Hedefler ile Özet ARASINDA duruyor ama
   * numaralar kaydırılMADI. `08-planlama-ozet`'i 09 yapmak, ondan
   * sonraki her rotayı da kaydırır ve e2e/__shots__ altındaki tüm
   * referans görüntüleri yetim bırakırdı — sıra numarası okuma
   * kolaylığı içindir, kimlik değil.
   */
  { slug: "07b-planlama-haftalik", path: "/planlama/haftalik", viewports: ALL },
  { slug: "08-planlama-ozet", path: "/planlama/ozet", viewports: ALL },
  { slug: "09-istatistik", path: "/istatistik", viewports: ALL },
  { slug: "10-rutinler", path: "/rutinler", viewports: ALL },
  { slug: "11-defter-notlar", path: "/defter/notlar", viewports: ALL },
  { slug: "12-defter-yanlislar", path: "/defter/yanlislar", viewports: ALL },
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
  await preparePage(page, "/planlama/ay");
  await page.screenshot({
    path: `${SHOT_DIR}/05-planlama-ay--wide.png`,
    fullPage: true,
  });
});

/* Yönlendirme stub'ları — görüntü değil, hedef doğrulanır. */
test("yönlendirmeler", async ({ page }) => {
  for (const [from, to] of [
    ["/takvim", "/takvim/ay"],
    ["/planlama", "/planlama/ay"],
    ["/defter", "/defter/notlar"],
    ["/takvim/plan", "/planlama/ay"],
  ]) {
    await page.goto(from);
    await expect(page).toHaveURL(new RegExp(`${to}$`));
  }
});
