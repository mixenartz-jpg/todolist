/* Katlama düğmelerinin dokunma hedefi ölçüsü (WCAG 2.2: en az 24px,
 * mobil için pratik hedef 44px). */
import { chromium } from "playwright";
import { readFileSync, readdirSync } from "node:fs";
const css = readdirSync(".next/static/chunks").filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync(`.next/static/chunks/${f}`, "utf8")).join("\n");

const html = `<!doctype html><html lang="tr" style="--font-inter:Inter"><head><meta charset="utf-8">
<style>${css}</style></head><body><div class="planSheet">
<section class="planWeekSection">
  <h2 class="planWeekLabel glassChrome glassChrome--top">
    <button class="planWeekToggle" aria-expanded="true">
      <svg width="10" height="10"></svg><span class="planWeekRange">16 – 22 Mart</span>
      <span class="planWeekCount tabular">9 iş</span></button></h2>
  <section class="planDayRow">
    <button class="planDayGutter planDayGutterButton">
      <span class="planDayNum tabular">14</span><span class="planDayWeekday">Cum</span></button>
    <div class="planDayField">
      <button class="planDayCollapse"><svg width="10" height="10"></svg>
        <span class="tabular">6 açık iş</span></button>
    </div></section>
</section></div></body></html>`;

const b = await chromium.launch();
for (const [name, w] of [["mobil", 390], ["masaustu", 1440]]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 }, colorScheme: "dark" });
  await p.setContent(html);
  const sizes = await p.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el, "::before");
      // ::before ile genisletilen alani da hesaba kat
      const grow = (v) => (v && v !== "auto" ? Math.abs(parseFloat(v)) : 0);
      return {
        w: Math.round(r.width + grow(cs.left) + grow(cs.right)),
        h: Math.round(r.height + grow(cs.top) + grow(cs.bottom)),
      };
    };
    return { hafta: box(".planWeekToggle"), gun: box(".planDayCollapse") };
  });
  console.log(name.padEnd(9), JSON.stringify(sizes));
  await p.close();
}
await b.close();
