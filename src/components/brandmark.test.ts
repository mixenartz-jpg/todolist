import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRAND_LOGO_PUBLIC_PATH, HAS_LOGO_FILE } from "./brandmark.config";

/*
 * `HAS_LOGO_FILE` sürüklenme nöbetçisi.
 *
 * ── Neden test, çalışma anı kontrolü DEĞİL? ──
 * `BrandMark` bir istemci bileşeni (`AppShell` "use client"); tarayıcıda
 * dosya sistemi yok ve `existsSync` oraya derlenemez. Kontrol derleme
 * öncesine, teste taşındı.
 *
 * ── Neyi yakalar? ──
 * İki yönlü sessiz sürüklenme:
 *   · Logo eklendi ama bayrak `false` kaldı → kabuk sonsuza dek yazı
 *     yedeğinde kalır ve kimse fark etmez.
 *   · Bayrak `true` ama dosya yok → `next/image` her sayfada 404 verir;
 *     `priority` olduğu için bu ilk boyada olur.
 *
 * İkisi de derlemeyi kırmaz, testi kırar. `colors.contrast.test.ts`
 * ile aynı aile: gözle görülmesi zor bir sözleşmeyi otomatik tutan kapı.
 */
describe("marka logosu bayrağı", () => {
  it("HAS_LOGO_FILE, public/ içindeki gerçek dosyayla aynı fikirde", () => {
    const varMi = existsSync(`public${BRAND_LOGO_PUBLIC_PATH}`);

    expect(
      HAS_LOGO_FILE,
      varMi
        ? `Logo dosyası public${BRAND_LOGO_PUBLIC_PATH} eklenmiş ama ` +
            "HAS_LOGO_FILE hâlâ false — kabuk yazı yedeğinde kalıyor."
        : `HAS_LOGO_FILE true ama public${BRAND_LOGO_PUBLIC_PATH} yok — ` +
            "logo her sayfada 404 verir.",
    ).toBe(varMi);
  });
});
