/*
 * Yapışkan hafta başlıklarının kaydırma davranışı.
 *
 * Haftalar varsayılan kapalı olunca art arda gelen başlıkların hepsi
 * `position: sticky; top: --header-h` oluyor. Kaydırınca üst üste
 * yığılıp yığılmadıklarını gözle görmek gerek.
 */
import { chromium } from "playwright";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";

const css = readdirSync(".next/static/chunks")
  .filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync(`.next/static/chunks/${f}`, "utf8")).join("\n");

function sec(label, count, katli, gunSayisi) {
  const gunler = katli ? "" : Array.from({ length: gunSayisi }, (_, i) => `
    <section class="planDayRow">
      <button class="planDayGutter planDayGutterButton">
        <span class="planDayNum tabular">${i + 1}</span>
        <span class="planDayWeekday">Gün</span>
      </button>
      <div class="planDayField"><div class="planQuickDemo">＋ Görev ekle</div></div>
    </section>`).join("");
  return `
  <section class="planWeekSection">
    <h2 class="planWeekLabel glassChrome glassChrome--top">
      <button class="planWeekToggle" aria-expanded="${!katli}">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
             style="${katli ? "" : "transform:rotate(90deg)"};color:var(--color-ink-3);flex:none">
          <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.4"
                stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="planWeekRange">${label}</span>
        <span class="planWeekCount tabular">${count} iş</span>
      </button>
    </h2>${gunler}
  </section>`;
}

const html = `<!doctype html><html lang="tr" style="--font-inter: Inter">
<head><meta charset="utf-8"><style>${css}</style><style>
  body { padding: 0; }
  .fakeHeader { position: sticky; top: 0; z-index: var(--z-sticky);
    padding: var(--header-py) var(--header-px);
    font-size: var(--text-xl); font-weight: 600; }
  .planQuickDemo { height: 36px; display: flex; align-items: center;
    padding: 0 10px; border-radius: var(--r-lg);
    border: 1px solid var(--color-line); background: var(--color-surface);
    font-size: var(--text-sm); color: var(--color-ink-3); }
</style></head><body>
  <header class="fakeHeader glassChrome glassChrome--top">Mart 2026</header>
  <div style="padding:0 1.5rem 40rem"><div class="planSheet">
    ${sec("2 – 8 Mart", 12, false, 7)}
    ${sec("9 – 15 Mart", 8, false, 7)}
    ${sec("16 – 22 Mart", 9, false, 7)}
    ${sec("23 – 29 Mart", 3, false, 7)}
  </div></div>
</body></html>`;

mkdirSync("e2e/__shots__/plan", { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 700 }, colorScheme: "dark", deviceScaleFactor: 1 });
await p.setContent(html);
await p.evaluate(() => document.fonts.ready);
// Ikinci haftanin ortasina kaydir: birinci baslik yapiskan olmali
await p.evaluate(() => window.scrollTo(0, 500));
await p.waitForTimeout(150);
await p.screenshot({ path: "e2e/__shots__/plan/sticky-yigilma.png" });

// Kac baslik ayni anda tepede yigilmis?
const stacked = await p.evaluate(() => {
  const hdr = document.querySelector(".fakeHeader").getBoundingClientRect();
  return [...document.querySelectorAll(".planWeekLabel")]
    .map((el) => ({ t: Math.round(el.getBoundingClientRect().top), label: el.textContent.trim().slice(0, 14) }))
    .filter((x) => x.t < hdr.bottom + 4);
});
console.log("Header alti/ustunde yigilan baslik sayisi:", stacked.length);
console.log(JSON.stringify(stacked, null, 1));
await b.close();
