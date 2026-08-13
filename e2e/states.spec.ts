import { test } from "@playwright/test";
import { preparePage, SHOT_DIR, VIEWPORTS } from "./shot";

/*
 * Durum çekimleri — cam malzemenin asıl yaşadığı yer.
 *
 * Rotaların kendisi bu görüntülere ASLA ulaşmaz: sheet, dialog ve
 * toast yalnızca bir etkileşimden sonra var olur, ama revizyonun en
 * riskli parçası (backdrop-filter) tam olarak onların üzerinde. Bu
 * dosya olmadan cam işi görsel doğrulamasız kalırdı.
 *
 * Her adım "açılmazsa çekimi atla" mantığıyla yazıldı: bu bir davranış
 * testi değil ve boş bir hesapta silinecek notu olmayabilir. Sessizce
 * geçmek yerine konsola not düşer — çekimin neden eksik olduğu
 * incelemede belli olsun.
 */

test("s1 — gün paneli (mobil)", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await preparePage(page, "/takvim/ay");

  const day = page.getByRole("button", { name: /Mart/ }).first();
  if ((await day.count()) === 0) {
    test.skip(true, "Takvimde açılabilir gün bulunamadı.");
  }
  await day.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOT_DIR}/s1-gun-paneli--mobile.png` });
});

test("s2 — gün paneli (masaüstü)", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await preparePage(page, "/takvim/ay");

  const day = page.getByRole("button", { name: /Mart/ }).first();
  if ((await day.count()) === 0) {
    test.skip(true, "Takvimde açılabilir gün bulunamadı.");
  }
  await day.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOT_DIR}/s2-gun-paneli--desktop.png` });
});

test("s3 — plan gün paneli", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await preparePage(page, "/planlama/ay");

  const day = page.getByRole("button", { name: /günü aç/ }).first();
  if ((await day.count()) === 0) {
    test.skip(true, "Plan ızgarasında açılabilir gün bulunamadı.");
  }
  await day.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOT_DIR}/s3-plan-gun-paneli.png` });
});

/*
 * Matris yapışkan hücreleri.
 *
 * `matrix.css` isim/başlık/köşe hücrelerinin OPAK olmasını şart
 * koşuyor; saydam olsalar altlarından içerik geçerdi (iOS'ta en kötü).
 * Revizyonda cam bu hücrelere UYGULANMAYACAK — bu çekim o kuralın
 * çiğnenip çiğnenmediğini disiplinle değil gözle yakalar.
 */
test("s4 — matris kaydırılmış (yapışkan opaklık)", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await preparePage(page, "/");

  await page.evaluate(() => {
    const scroller = document.querySelector(".matrixScroll");
    if (scroller) scroller.scrollLeft = 240;
    window.scrollTo(0, 200);
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${SHOT_DIR}/s4-matris-kaydirilmis.png` });
});

/*
 * Mobil sekme çubuğunun ALTINDAN geçen içerik.
 *
 * Cam malzemenin bütün amacı bu kare: çubuk altındaki içerik
 * dağılmış ama hareketi hissedilir olmalı. Referansta opak bir şerit
 * görünecek; revizyon sonrası aynı karede malzeme olacak.
 */
test("s5 — cam altında içerik (mobil, kaydırılmış)", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await preparePage(page, "/bugun");

  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${SHOT_DIR}/s5-cam-alti-icerik.png` });
});

/*
 * Onay diyaloğu — `<dialog>` + `::backdrop`, revizyonda scrim blur'u
 * 2px'ten `--glass-scrim-blur`a çıkıyor.
 *
 * Silme akışı YAZMAZ: diyalog açılır, çekilir ve İPTAL edilir. Çekim
 * harness'ı kullanıcının gerçek verisini asla değiştirmemeli.
 */
test("s6 — onay diyaloğu", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await preparePage(page, "/rutinler");

  const remove = page.getByRole("button", { name: /Sil/ }).first();
  if ((await remove.count()) === 0) {
    test.skip(true, "Silinebilir bir öğe yok — diyalog açılamadı.");
  }
  await remove.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOT_DIR}/s6-onay-diyalogu.png` });

  await page.keyboard.press("Escape");
});
