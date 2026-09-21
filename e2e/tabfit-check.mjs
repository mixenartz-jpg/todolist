/* Sekme çubuklarının dar ekranlara sığdığını doğrular.
 *
 * İKİ çubuk ölçülür:
 *  1. Alt gezinme (AppShell) — beş sekme, eşit bölüşüm, kaydırma YOK
 *  2. Planlama alt sekmeleri — beş sekme, sabit dolgu
 *
 * İkisinde de taşma SESSİZDİR: alt çubukta sekmeler `truncate` taşıdığı
 * için etiket kırpılır ("Rutinle…") ve hiçbir hata çıkmaz; Planlama
 * çubuğunda sekmeler sıkışır. Bu yüzden ölçüm otomatik olmalı.
 *
 * EŞİK 320px, 288 DEĞİL: 288 en dar test kutusudur, üretimdeki en dar
 * cihaz 320px (iPhone SE).
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

/** Taşma kabul edilmeyen en dar genişlik. */
const MIN_WIDTH = 320;

/** AppShell.tsx'teki NAV dizisiyle aynı sırada — kısa etiketler. */
const NAV_TABS = ["Bugün", "Plan", "Tablo", "İstat.", "Rutinler"];

/** PlanlamaTabs.tsx'teki TABS dizisiyle aynı sırada. */
const PLAN_TABS = ["Ay", "Hafta", "Hedefler", "Haftalık", "Özet"];

const page = (body, extraCss = "") => `<!doctype html><html lang="tr"
style="--font-inter:Inter"><head><meta charset="utf-8"><style>${css}
body{margin:0}
.probe{width:100%}
${extraCss}</style></head><body>${body}</body></html>`;

/* AppShell'in MobileTabBar işaretlemesinin birebir kopyası — sınıflar
   orada değişirse burası da değişmeli. */
const navHtml = page(
  `<div class="probe"><nav id="bar" class="tabBar">${NAV_TABS.map(
    (label) =>
      `<a class="tabBarItem flex flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-[length:var(--text-2xs)]">` +
      `<svg width="16" height="16"></svg><span class="max-w-full truncate">${label}</span></a>`,
  ).join("")}</nav></div>`,
);

/* PlanlamaTabs.tsx'in ürettiği işaretlemenin birebir kopyası. */
const planHtml = page(
  `<div class="probe"><nav id="bar" class="flex gap-0.5 rounded-lg bg-[var(--color-surface-2)] p-1">${PLAN_TABS.map(
    (label, i) =>
      `<a class="rounded-md px-2 py-1.5 text-[length:var(--text-sm)] ${
        i === 3 ? "font-medium" : ""
      }">${label}</a>`,
  ).join("")}</nav></div>`,
  ".probe{padding:0 1rem}",
);

const b = await chromium.launch();
let failed = false;

/**
 * Bir çubuğu ölçer.
 *
 * `checkTruncation`: alt gezinme çubuğunda etiketler `truncate` taşır,
 * yani taşma bir hata vermez — SESSİZCE kırpılır. Bu yüzden orada
 * `scrollWidth > clientWidth` kontrolü etiket düzeyinde de yapılır.
 */
async function measure(name, html, { checkTruncation }) {
  console.log(`\n── ${name} ──`);

  for (const w of [288, 320, 375, 414]) {
    const p = await b.newPage({
      viewport: { width: w, height: 600 },
      colorScheme: "dark",
    });
    await p.setContent(html);

    const r = await p.evaluate(() => {
      const bar = document.getElementById("bar");
      const items = [...bar.children];
      return {
        scrollWidth: bar.scrollWidth,
        clientWidth: bar.clientWidth,
        tabs: items.map((el) => ({
          label: el.textContent.trim(),
          w: Math.round(el.getBoundingClientRect().width),
          // Etiket kendi kutusuna sığıyor mu? `truncate` yüzünden
          // taşma görünür bir hata vermez, sadece "…" bırakır.
          clipped: (() => {
            const span = el.querySelector("span") ?? el;
            return span.scrollWidth > span.clientWidth + 1;
          })(),
        })),
        minTap: Math.min(...items.map((el) => el.getBoundingClientRect().width)),
      };
    });

    const overflow = r.scrollWidth > r.clientWidth;
    const tapTooSmall = r.minTap < 24;
    const clipped = r.tabs.filter((t) => t.clipped).map((t) => t.label);

    if (w >= MIN_WIDTH) {
      if (overflow || tapTooSmall) failed = true;
      if (checkTruncation && clipped.length > 0) failed = true;
    }

    console.log(
      `${String(w).padEnd(4)} ${overflow ? "TASMA" : "sigar"}  ` +
        `gereken=${r.scrollWidth} kutu=${r.clientWidth} endar=${Math.round(r.minTap)}px` +
        (clipped.length ? `  KIRPILDI: ${clipped.join(", ")}` : "") +
        `\n     ` +
        r.tabs.map((t) => `${t.label}:${t.w}`).join(" "),
    );
    await p.close();
  }
}

await measure("Alt gezinme (AppShell)", navHtml, { checkTruncation: true });
await measure("Planlama alt sekmeleri", planHtml, { checkTruncation: false });

await b.close();

if (failed) {
  console.error(
    `\n✗ ${MIN_WIDTH}px'te sorun var: tasma, kirpilmis etiket ya da ` +
      `24px altinda dokunma hedefi.\n` +
      `  Alt gezinme icin cozum: sekme SAYISINI azalt (nav-bar.css'teki\n` +
      `  aritmetik notu) ya da shortLabel kisalt. Planlama icin\n` +
      `  PlanlamaTabs.tsx'teki olcum notuna bak.`,
  );
} else {
  console.log(
    `\n✓ ${MIN_WIDTH}px ve uzeri: iki cubuk da sigiyor, etiket ` +
      `kirpilmiyor, dokunma hedefi korunuyor.`,
  );
}
process.exit(failed ? 1 : 0);
