import { test } from "@playwright/test";
import { preparePage, SHOT_DIR, VIEWPORTS } from "./shot";

/*
 * Giriş ekranı — `anon` projesinde çalışır, oturum durumu YÜKLENMEZ.
 *
 * Oturum varken `middleware.ts` `/giris`'i `/`'a yönlendirir ve ekran
 * hiç görülmez. Bu yüzden ayrı bir proje ve ayrı bir dosya.
 *
 * Uygulamanın tek dekoratif kompozisyonu burada: `login.css`'teki
 * maskelenmiş matris ızgarası. Revizyonda zemin koyulaştığı için
 * ızgaranın göreli baskınlığı değişecek — çekim o ayarı yapmak için.
 */

test("13-giris @ mobile", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await preparePage(page, "/giris");
  await page.screenshot({
    path: `${SHOT_DIR}/13-giris--mobile.png`,
    fullPage: true,
  });
});

test("13-giris @ desktop", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await preparePage(page, "/giris");
  await page.screenshot({
    path: `${SHOT_DIR}/13-giris--desktop.png`,
    fullPage: true,
  });
});
