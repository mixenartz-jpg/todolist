import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";

/*
 * `.env.local` elle yüklenir.
 *
 * Next.js onu kendi süreci için okur ama Playwright ayrı bir süreçtir
 * ve `E2E_EMAIL` / `E2E_PASSWORD` oraya ulaşmazdı. `loadEnvFile`
 * Node 20.12+ yerleşiği — yeni bağımlılık gerekmiyor.
 */
if (existsSync(".env.local")) loadEnvFile(".env.local");

/*
 * Görsel referans harness'ı.
 *
 * Bu yapılandırmanın amacı davranış testi DEĞİL, ekran görüntüsü
 * üretmektir: frontend revizyonu öncesi/sonrası yan yana konabilsin.
 * Revizyon bittiğinde `shots.spec.ts` içindeki `page.screenshot()`
 * çağrıları `toHaveScreenshot()`'a çevrilir ve bu harness kalıcı
 * regresyon ağı olur.
 *
 * ── Neden `next start`, `next dev` DEĞİL? ──
 * Dev sunucusu hata katmanını (overlay), HMR'in enjekte ettiği stilleri
 * ve yarım yüklenmiş fontları ekrana getirir. Bunların hiçbiri üründe
 * yok; referansı kirletirler ve her diff'te gürültü olurlar.
 */

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/** Oturum durumunun yazıldığı yer — `.gitignore`'da. */
export const STORAGE_STATE = "e2e/.auth/user.json";

/*
 * Her projenin paylaştığı tarayıcı ayarları.
 *
 * `devices["Desktop Chrome"]` spread'inden SONRA yazılmaları şart:
 * o hazır ayar `deviceScaleFactor: 1` getiriyor ama ileride
 * değişebilir ve sessizce ezilmeleri çekimleri iki katına çıkarırdı.
 * Tek nesnede toplamak, üç projenin de aynı koşullarda çekim
 * yaptığını yapısal olarak garanti eder.
 */
const SHOT_USE = {
  ...devices["Desktop Chrome"],

  /*
   * Hareket kapatılır: giriş animasyonunun ortasında yakalanmış bir
   * kare her çalıştırmada farklı çıkar. Uygulama zaten
   * `prefers-reduced-motion` saygılı (globals.css), yani bu ayar
   * ürünün gerçek bir yolunu kullanır, sahte bir durum yaratmaz.
   */
  reducedMotion: "reduce",
  colorScheme: "dark",

  /* 2x çekim dosyayı dörde katlar, yan yana incelemede hiçbir şey
   * kazandırmaz. */
  deviceScaleFactor: 1,
} as const;

export default defineConfig({
  testDir: "./e2e",

  /*
   * Çekimler tek tek ve sırayla alınır.
   *
   * Paralellik burada kazanç değil risk: aynı Supabase hesabına aynı
   * anda yazan iki worker, birbirinin ekranındaki veriyi değiştirir ve
   * referans ile sonrası farkı "revizyon" değil "veri" olur.
   */
  workers: 1,
  fullyParallel: false,

  /* Çekim başarısız olursa tekrar denemek yanlış görüntüyü gizler. */
  retries: 0,

  reporter: [["list"]],

  use: { baseURL: BASE_URL },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: SHOT_USE,
    },
    {
      /* Oturum isteyen rotalar ve durum çekimleri. */
      name: "app",
      dependencies: ["setup"],
      testMatch: /(shots|states)\.spec\.ts/,
      use: { ...SHOT_USE, storageState: STORAGE_STATE },
    },
    {
      /*
       * `/giris` oturumSUZ olmalı: oturum varken middleware onu `/`'a
       * yönlendirir ve giriş ekranı hiç görülmez.
       */
      name: "anon",
      testMatch: /login\.spec\.ts/,
      use: SHOT_USE,
    },
  ],

  webServer: {
    command: `npm run build && npx next start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    /* Next derlemesi soğuk başlangıçta birkaç dakika sürebilir. */
    timeout: 5 * 60 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
