/*
 * Ajanda kağıdının statik önizlemesi — gözle bakmak için.
 *
 * Planlama ekranı Supabase oturumu arkasında; yerleşimi görmek için
 * üretilmiş CSS'i alıp aynı DOM'u elle kurarız. Yerleşim tamamen
 * CSS'te olduğu için gerçek ekranla aynı sonucu verir.
 *
 * TEST DEĞİL — `playwright.config.ts` bunu `testMatch`'e almaz.
 */
import { chromium } from "playwright";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";

const CHUNKS = ".next/static/chunks";
const css = readdirSync(CHUNKS)
  .filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync(`${CHUNKS}/${f}`, "utf8"))
  .join("\n");

const GUNLER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function row(num, gun, gorevler, opts = {}) {
  const { bugun, gecmis, haftaSonu, bos, plan, katli } = opts;
  const cls = [
    "planDayRow",
    bugun && "planDayRowToday",
    gecmis && "planDayRowPast",
    haftaSonu && "planDayRowWeekend",
    bos && "planDayRowEmpty",
    katli && "planDayRowCollapsed",
  ].filter(Boolean).join(" ");

  const tasks = gorevler.map((t) => `
    <li class="planTaskDemo">
      <span class="planCheckDemo"></span>
      <span class="planTitleDemo">${t}</span>
      <span class="planIconsDemo">🕐 →| 🗑</span>
    </li>`).join("");

  return `
  <section class="${cls}">
    <button class="planDayGutter planDayGutterButton">
      <span class="planDayNum tabular">${num}</span>
      <span class="planDayWeekday">${gun}</span>
      ${gorevler.length ? `<span class="planDayCount tabular">${gorevler.length}</span>` : ""}
      ${plan ? `<span class="planDayDot"></span>` : ""}
    </button>
    <div class="planDayField">
      ${gorevler.length ? `<button class="planDayCollapse">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
             style="${katli ? "" : "transform:rotate(90deg)"};color:var(--color-ink-3)">
          <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.4"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>${katli ? `<span class="tabular">${gorevler.length} açık iş</span>` : ""}
      </button>` : ""}
      ${!katli && gorevler.length ? `<ul class="planDayTasks">${tasks}</ul>` : ""}
      ${katli ? "" : `<div class="planQuickDemo">＋ Görev ekle</div>`}
    </div>
  </section>`;
}

/* Ekran görüntüsündeki GERÇEK uzun başlıklar — kırpılma buradaydı. */
const hafta = [
  row(13, GUNLER[3], [], { bos: true }),
  row(14, GUNLER[4], [
    "Deneme Analizi (Tüm Dersler) — yanlış çözümleri deftere geçir",
    "Orijinal TYT Matematik Deneme 12 tam çözüm",
    "Dil Bilgisi Videosunu Tamamla",
    "Biyoloji Videosunun Kalanını Tamamla",
    "2 Tane Fen Branş Denemesi Çöz",
    "20 Sayfa Kitap Oku (Pürdikkat)",
  ], { katli: true }),
  row(15, GUNLER[5], [], { haftaSonu: true, bos: true }),
  row(16, GUNLER[0], [
    "Matematik integral konu anlatımı izle ve örnek çöz",
    "İngilizce kelime tekrarı 40 adet",
    "Fizik optik deneme",
  ], { bugun: true, plan: true }),
].join("");

function sec(label, count, katli, icerik) {
  return `
  <section class="planWeekSection">
    <h2 class="planWeekLabel glassChrome glassChrome--top">
      <button class="planWeekToggle" aria-expanded="${!katli}">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
             style="${katli ? "" : "transform:rotate(90deg)"};color:var(--color-ink-3);flex:none">
          <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.4"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="planWeekRange">${label}</span>
        <span class="planWeekCount tabular">${count} iş</span>
      </button>
    </h2>
    ${icerik}
  </section>`;
}

const html = `<!doctype html>
<html lang="tr" class="h-full antialiased" style="--font-inter: Inter">
<head><meta charset="utf-8"><style>${css}</style>
<style>
  /* ÖNİZLEME İÇİN: gerçek TaskItem'ın ölçülerini ve sarma davranışını
     taklit eden basit kutular. */
  body { padding: 24px; }
  .planTaskDemo {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 10px 12px; border-radius: var(--r-xl);
    border: 1px solid var(--color-line);
    background: var(--color-surface);
    font-size: var(--text-base); color: var(--color-ink);
    line-height: var(--leading-normal);
  }
  .planCheckDemo {
    width: 40px; height: 40px; flex: none; margin-top: -2px;
    border: 1.5px solid var(--color-line-3); border-radius: var(--r-lg);
  }
  /* break-words: kırpma YOK, sarma VAR */
  .planTitleDemo { min-width: 0; flex: 1; overflow-wrap: break-word; }
  .planIconsDemo {
    flex: none; margin-top: 2px;
    font-size: var(--text-xs); color: var(--color-ink-3);
  }
  .planQuickDemo {
    height: 36px; display: flex; align-items: center;
    padding: 0 10px; border-radius: var(--r-lg);
    border: 1px solid var(--color-line);
    background: var(--color-surface);
    font-size: var(--text-sm); color: var(--color-ink-3);
  }
</style></head>
<body>
  <div class="planLayout">
    <div class="planSheet">
      ${sec("2 – 8 Mart", 12, true, "")}
      ${sec("9 – 15 Mart", 8, true, "")}
      ${sec("16 – 22 Mart", 9, false, hafta)}
      ${sec("23 – 29 Mart", 3, true, "")}
    </div>
  </div>
</body></html>`;

mkdirSync("e2e/__shots__/plan", { recursive: true });
const b = await chromium.launch();

for (const [name, w, h] of [
  ["desktop", 1440, 800],
  ["tablet", 834, 800],
  ["mobile", 390, 800],
  ["mobile-320", 320, 800],
]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: "dark", deviceScaleFactor: 1 });
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `e2e/__shots__/plan/katlama-${name}.png`, fullPage: true });
  await p.close();
  console.log("cekildi:", name);
}
await b.close();
