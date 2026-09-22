import { describe, expect, it } from "vitest";
import { asDateStr, endOfMonth, startOfMonth } from "@/lib/date/date";
import { task } from "@/features/testing/fixtures";
import { monthGrid } from "./monthgrid";
import { buildPlanRange } from "./range";
import { enYogunHafta, weekSummaries } from "./weekmap";

/*
 * Ağustos 2026 Cumartesi başlar: ay ızgarası 27 Temmuz Pazartesi'den
 * başlar ve komşu aylardan taşma günleri içerir. Ayın ilk haftası
 * (27 Tem – 2 Ağu) yalnızca iki günüyle Ağustos'ta.
 */
const AGUSTOS = asDateStr("2026-08-01");
const TODAY = asDateStr("2026-08-05");

/** Ay ızgarasının kovaları — `PlanlamaScreen`'in ay dalıyla aynı. */
function agustosBuckets(tasks: Parameters<typeof buildPlanRange>[0] = []) {
  const dates = monthGrid(2026, 8).map((c) => c.date);
  return buildPlanRange(
    tasks,
    dates,
    startOfMonth(AGUSTOS),
    endOfMonth(AGUSTOS),
  ).buckets;
}

describe("weekSummaries", () => {
  it("kırk iki gün hücresini hafta satırlarına indirger", () => {
    const haftalar = weekSummaries(agustosBuckets(), TODAY);

    // Ağustos 2026 altı ızgara haftası kaplar.
    expect(haftalar).toHaveLength(6);
    // Her satır bir Pazartesi'de başlar.
    expect(haftalar[0].weekStart).toBe(asDateStr("2026-07-27"));
    expect(haftalar[1].weekStart).toBe(asDateStr("2026-08-03"));
  });

  it("hafta bitişi HER ZAMAN Pazar — kısa son satırda bile", () => {
    /*
     * `chunkWeeks` son satırı kısa döndürebiliyor. Bitiş son
     * kovadan alınsaydı ekranda "24 – 27 Ağustos" gibi eksik bir
     * hafta yazardı.
     */
    const haftalar = weekSummaries(agustosBuckets(), TODAY);

    for (const h of haftalar) {
      const gun = new Date(`${h.weekEnd}T00:00:00Z`).getUTCDay();
      expect(gun).toBe(0); // 0 = Pazar
    }
  });

  it("sayaçları haftanın günlerinden TOPLAR", () => {
    const haftalar = weekSummaries(
      agustosBuckets([
        task({ id: "a", dueDate: "2026-08-03", done: false }),
        task({ id: "b", dueDate: "2026-08-05", done: false }),
        task({ id: "c", dueDate: "2026-08-07", done: true }),
        // Sonraki hafta — karışmamalı.
        task({ id: "d", dueDate: "2026-08-11", done: false }),
      ]),
      TODAY,
    );

    const ilkTamHafta = haftalar.find(
      (h) => h.weekStart === asDateStr("2026-08-03"),
    );
    expect(ilkTamHafta?.openCount).toBe(2);
    expect(ilkTamHafta?.doneCount).toBe(1);

    const ikinci = haftalar.find(
      (h) => h.weekStart === asDateStr("2026-08-10"),
    );
    expect(ikinci?.openCount).toBe(1);
  });

  it("bugünü içeren haftayı işaretler — yalnızca birini", () => {
    const haftalar = weekSummaries(agustosBuckets(), TODAY);
    const isaretli = haftalar.filter((h) => h.hasToday);

    expect(isaretli).toHaveLength(1);
    expect(isaretli[0].weekStart).toBe(asDateStr("2026-08-03"));
  });

  it("bir günü bile ayda olan hafta KAPSAMDADIR", () => {
    /*
     * Ayın ilk haftası (27 Tem – 2 Ağu) yalnızca iki günüyle
     * Ağustos'ta. Tüm günlerin ayda olması şart koşulsaydı, ayın
     * ilk ve son haftası daima soluk görünürdü — halbuki onlar da
     * o ayın haftaları.
     */
    const haftalar = weekSummaries(agustosBuckets(), TODAY);

    expect(haftalar.every((h) => h.inScope)).toBe(true);
  });

  it("boş ayda da hafta satırlarını döndürür", () => {
    // Hiç görev yoksa harita boş kalmamalı: haftalar görünür ve
    // tıklanabilir olmalı, yalnızca sayaçları sıfır.
    const haftalar = weekSummaries(agustosBuckets(), TODAY);

    expect(haftalar.length).toBeGreaterThan(0);
    expect(haftalar.every((h) => h.openCount === 0)).toBe(true);
  });

  it("hiç kova yoksa boş dizi döner", () => {
    expect(weekSummaries([], TODAY)).toEqual([]);
  });
});

describe("enYogunHafta", () => {
  it("en dolu haftanın toplam iş sayısını verir", () => {
    const haftalar = weekSummaries(
      agustosBuckets([
        task({ id: "a", dueDate: "2026-08-03", done: false }),
        task({ id: "b", dueDate: "2026-08-04", done: false }),
        task({ id: "c", dueDate: "2026-08-05", done: true }),
        task({ id: "d", dueDate: "2026-08-11", done: false }),
      ]),
      TODAY,
    );

    // 3 Ağustos haftası: 2 açık + 1 bitmiş = 3.
    expect(enYogunHafta(haftalar)).toBe(3);
  });

  it("hiç iş yoksa 1 döner — çağıran sıfıra BÖLMESİN", () => {
    /*
     * 0 dönseydi çubuk genişliği hesabı `x / 0` olurdu. 1 dönmek
     * tüm çubukları boş çizer: doğru sonuç, özel dal gerektirmeden.
     */
    expect(enYogunHafta(weekSummaries(agustosBuckets(), TODAY))).toBe(1);
    expect(enYogunHafta([])).toBe(1);
  });
});
