/* Planlama sekme çubuğunun dar ekranlara sığdığını doğrular.
 *
 * Çubuk beş sekmeyle DOLU: her etiket değişimi ya da yeni sekme onu
 * taşırabilir ve taşma sessizdir (yatay kaydırma yok, sekmeler sıkışır).
 * PlanlamaTabs.tsx'teki ölçüm notu bu script'in çıktısına dayanıyor;
 * ikisi birlikte güncellenmeli.
 *
 * EŞİK 320px, 288 DEĞİL: 288 en dar test kutusudur, üretimdeki en dar
 * cihaz 320px (iPhone SE). 288'e kadar inmek dolguyu px-1.5'e
 * düşürmeyi gerektiriyor ve o da "Ay" sekmesinin dokunma hedefini
 * 28px'e indiriyordu — WCAG 2.2 asgarisinin (24px) hemen üstü.
 *
 * Çalıştırma: `npm run build` sonrası `node e2e/tabfit-check.mjs`
 * (gerçek derlenmiş CSS'i okur, elle yazılmış ölçü kullanmaz).
 */
import { chromium } from "playwright";
import { readFileSync, readdirSync } from "node:fs";

const css = readdirSync(".next/static/chunks")
  .filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync(`.next/static/chunks/${f}`, "utf8"))
  .join("\n");

/** PlanlamaTabs.tsx'teki TABS dizisiyle aynı sırada. */
const TABS = ["Ay", "Hafta", "Hedefler", "Haftalık", "Özet"];

/** Taşma kabul edilmeyen en dar genişlik. */
const MIN_WIDTH = 320;

// PlanlamaTabs.tsx'in ürettiği işaretlemenin birebir kopyası —
// dolgu/boşluk sınıfları oradan değişirse burası da değişmeli.
const links = TABS.map(
  (label, i) =>
    `<a class="rounded-md px-2 py-1.5 text-[length:var(--text-sm)] ${
      i === 3 ? "font-medium" : ""
    }">${label}</a>`,
).join("");

const html = `<!doctype html><html lang="tr" style="--font-inter:Inter"><head>
<meta charset="utf-8"><style>${css}
body{margin:0}
/* layout.tsx'in kabı: sekme çubuğu bu genişlikte yaşıyor. */
.probe{width:100%;padding:0 1rem}</style></head><body>
<div class="probe"><nav id="bar" aria-label="Planlama görünümleri"
  class="flex gap-0.5 rounded-lg bg-[var(--color-surface-2)] p-1">${links}</nav></div>
</body></html>`;

const b = await chromium.launch();
let failed = false;

for (const w of [320, 375, 414]) {
  const p = await b.newPage({ viewport: { width: w, height: 600 }, colorScheme: "dark" });
  await p.setContent(html);

  const r = await p.evaluate(() => {
    const bar = document.getElementById("bar");
    return {
      scrollWidth: bar.scrollWidth,
      clientWidth: bar.clientWidth,
      tabs: [...bar.children].map((el) => ({
        label: el.textContent,
        w: Math.round(el.getBoundingClientRect().width),
      })),
      // WCAG 2.2 hedef boyutu: en dar sekme 24px'in altına inmemeli.
      minTap: Math.min(
        ...[...bar.children].map((el) => el.getBoundingClientRect().width),
      ),
    };
  });

  const overflow = r.scrollWidth > r.clientWidth;
  const tapTooSmall = r.minTap < 24;
  if ((overflow && w >= MIN_WIDTH) || tapTooSmall) failed = true;

  console.log(
    `${String(w).padEnd(4)} ${overflow ? "TASMA" : "sigar"}  ` +
      `gereken=${r.scrollWidth} kutu=${r.clientWidth} endar=${Math.round(r.minTap)}px  ` +
      r.tabs.map((t) => `${t.label}:${t.w}`).join(" "),
  );
  await p.close();
}

await b.close();

if (failed) {
  console.error(
    `\n✗ Sekme cubugu ${MIN_WIDTH}px'e sigmiyor ya da dokunma hedefi 24px altinda.\n` +
      `  Cozum secenekleri PlanlamaTabs.tsx'teki olcum notunda yazili.`,
  );
} else {
  console.log(`\n✓ ${MIN_WIDTH}px ve uzeri: sigiyor, dokunma hedefi korunuyor.`);
}
process.exit(failed ? 1 : 0);
