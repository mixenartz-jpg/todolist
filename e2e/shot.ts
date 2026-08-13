import type { Page } from "@playwright/test";

/*
 * Çekim yardımcıları — determinizm burada kurulur.
 *
 * İki çalıştırma arasındaki HER fark revizyondan gelmeli. Tarih,
 * font yüklenmesi ve animasyon karesi bunu bozan üç şeydir; üçü de
 * burada susturulur.
 */

/** Referans (`baseline`) mı, revizyon sonrası (`current`) mı. */
export const SHOT_LABEL = process.env.SHOT_LABEL ?? "current";

export const SHOT_DIR = `e2e/__shots__/${SHOT_LABEL}`;

/**
 * Sabit "bugün": 16 Mart 2026, Pazartesi.
 *
 * Bilinçli seçim — bu tarih aynı anda şunları tetikler:
 *  · pazartesi  → `.weekStart` ve hafta başlangıcı mantığı
 *  · ay ortası  → önceki VE sonraki ayın taşma günleri plan ızgarasında
 *  · Mart 2026  → 1'i pazar, 31 gün → takvim 6 satırlık tam ay
 *
 * Dondurulmazsa referans ile sonrası bir gün kayar ve her diff
 * gürültüye boğulur.
 */
export const FROZEN_NOW = new Date("2026-03-16T09:00:00");

export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 900 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

/**
 * Sayfayı çekime hazırlar: saati dondurur, gider, fontları ve ağı
 * bekler, kalan hareketi susturur.
 *
 * Saat `goto`'dan ÖNCE kurulur — sayfa ilk render'ında `new Date()`
 * çağırıyor ve sonradan kurmak o ilk değeri kaçırırdı.
 */
export async function preparePage(page: Page, path: string): Promise<void> {
  await page.clock.install({ time: FROZEN_NOW });
  await page.goto(path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await freezeMotion(page);
}

/**
 * Kalan hareketi durdurur.
 *
 * `reducedMotion: "reduce"` (playwright.config.ts) uygulamanın kendi
 * `@media (prefers-reduced-motion)` bloğunu tetikliyor ve o blok
 * süreleri 0.01ms'e indiriyor — ama `animate-pulse` iskeletleri
 * `animation-iteration-count: 1` ile tek tur atıp rastgele bir
 * opaklıkta donuyor. Burada onları da sabitliyoruz.
 */
async function freezeMotion(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });
}

/**
 * Token kanaryası — tree-shaking'in sessiz hata modunu yakalar.
 *
 * Tailwind v4 `@theme` değişkenlerini sınıf adında geçmiyorlarsa CSS
 * çıktısına hiç yazmaz. Yalnızca el yazımı CSS'ten veya inline
 * `style`'dan okunan bir token böyle sessizce boş kalır ve hiçbir
 * derleme hatası vermez. Dört satırlık bu kontrol her rotada çalışır.
 */
export async function assertTokensPresent(
  page: Page,
  tokens: readonly string[],
): Promise<string[]> {
  return page.evaluate((names) => {
    const style = getComputedStyle(document.documentElement);
    return names.filter((name) => style.getPropertyValue(name).trim() === "");
  }, tokens);
}

/** Faz 1 sonrası var olması ZORUNLU token'lar. */
export const REQUIRED_TOKENS = [
  "--color-bg",
  "--color-surface",
  "--color-ink",
  "--color-slot-0",
  "--color-level-0",
] as const;
