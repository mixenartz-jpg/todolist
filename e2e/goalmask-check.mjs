/*
 * Hedef listesinin soluma maskesi KOŞULLU mu?
 *
 * Bildirilen hata: tek hedefi olan kullanıcıda kart "kutucuk gibi
 * görünmüyor" — maske koşulsuz uygulandığı için kısa listede de kartın
 * üst/alt kenarı eriyor, kenarlık gradyanda kayboluyordu.
 *
 * Ölçülen üç senaryo:
 *
 *   kısa liste (kaydırma YOK) → maske OLMAMALI, kart tam kenarlıklı
 *   uzun liste (kaydırma VAR) → maske OLMALI, kesilme işaretli
 *   reduce kipi              → kısa liste YİNE temiz kalmalı
 *
 * Üçüncüsü ayrı ölçülüyor çünkü globals.css'teki küresel kural `*`
 * seçicisiyle `animation-duration: 0.01ms !important` dayatıyor ve
 * maske artık bir ANİMASYON üzerinden çalışıyor. O kuralın kısa
 * listede maskeyi geri getirip getirmediği tahmin edilecek değil,
 * ölçülecek bir şeydir — hatanın yalnızca erişilebilirlik kipinde
 * geri dönmesi tam da gözden kaçacak türden.
 */
import { chromium } from "playwright";
import { readFileSync, readdirSync } from "node:fs";

const css = readdirSync(".next/static/chunks")
  .filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync(`.next/static/chunks/${f}`, "utf8"))
  .join("\n");

const list = (id, n) =>
  `<ul class="goalList" id="${id}">` +
  Array.from({ length: n }, (_, i) => `<li class="goalCardDemo">Hedef ${i + 1}</li>`).join("") +
  `</ul>`;

const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<style>${css}</style><style>
  body { padding: 24px; background: var(--color-bg); }
  .goalCardDemo {
    border: 1px solid var(--color-line);
    border-radius: var(--r-xl);
    background: var(--color-surface);
    padding: 14px;
    color: var(--color-ink);
    margin-bottom: 8px;
  }
</style></head><body>
${list("short", 1)}
${list("long", 12)}
</body></html>`;

const browser = await chromium.launch();
const problems = [];

for (const motion of ["no-preference", "reduce"]) {
  const page = await browser.newPage({
    viewportSize: { width: 900, height: 800 },
    reducedMotion: motion,
  });
  await page.setContent(html);
  await page.waitForTimeout(300);

  const out = await page.evaluate(() => {
    const read = (id) => {
      const el = document.getElementById(id);
      const cs = getComputedStyle(el);
      return {
        id,
        scrollable: el.scrollHeight > el.clientHeight + 1,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        maskImage: cs.maskImage,
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
      };
    };
    return [read("short"), read("long")];
  });

  console.log(`--- prefers-reduced-motion: ${motion} ---`);
  console.log(JSON.stringify(out, null, 2));

  const short = out.find((o) => o.id === "short");
  const long = out.find((o) => o.id === "long");
  const tag = `[${motion}]`;

  if (short.scrollable) problems.push(`${tag} kısa liste kayıyor — senaryo geçersiz`);
  if (!long.scrollable) problems.push(`${tag} uzun liste kaymıyor — senaryo geçersiz`);

  // Asıl şart: kısa listede maske YOK.
  if (short.maskImage !== "none")
    problems.push(`${tag} KISA listede maske var: ${short.maskImage}`);

  /*
   * Uzun listede maske yalnızca normal kipte şart. `reduce` kipinde
   * maskesizlik kabul edilir — kesilme işareti kaydırma çubuğuna
   * devrolur ve hareketsizlik tercihine saygı gösterilmiş olur.
   */
  if (motion === "no-preference" && long.maskImage === "none")
    problems.push(`${tag} UZUN listede maske YOK — kesilme işaretsiz`);

  await page.close();
}

console.log(problems.length ? "FAIL\n" + problems.join("\n") : "PASS");
await browser.close();
process.exit(problems.length ? 1 : 0);
