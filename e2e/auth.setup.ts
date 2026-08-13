import { test as setup, expect } from "@playwright/test";
import { STORAGE_STATE } from "../playwright.config";

/*
 * Oturum durumunu bir kez kurar ve diske yazar.
 *
 * `middleware.ts` → `src/lib/supabase/middleware.ts`: `/giris` ve
 * `/auth` dışındaki her yol oturumsuzken `/giris`'e yönlendirilir.
 * Yani 16 rotanın çekimi için gerçek bir oturum şart.
 *
 * Kimlik bilgileri `.env.local`'dan okunur ve ASLA kod içine yazılmaz.
 * `.gitignore` `.env*` deseniyle o dosyayı zaten dışarıda tutuyor.
 */
setup("oturum aç", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_EMAIL ve E2E_PASSWORD tanımlı değil.\n" +
        ".env.local dosyasına ekle:\n" +
        "  E2E_EMAIL=ornek@mail.com\n" +
        "  E2E_PASSWORD=parolan\n",
    );
  }

  await page.goto("/giris");

  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();

  /*
   * Yönlendirmenin TAMAMLANMASI beklenir, tıklama değil: Supabase
   * oturumu kurup çerezi yazana kadar `storageState()` boş çıkardı.
   * Ana gezinmenin görünmesi oturumun gerçekten kurulduğunun kanıtı —
   * `AppShell` yalnızca `(app)` grubunda render edilir.
   */
  await page.waitForURL("/");
  await expect(
    page.getByRole("navigation", { name: "Ana gezinme" }).first(),
  ).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
