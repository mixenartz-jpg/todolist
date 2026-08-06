import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import {
  completedRange,
  entries,
  entriesOn,
  mergeEntries,
  noEntries,
  routine,
} from "@/features/testing/fixtures";
import {
  completionRate,
  dayScore,
  densityLevel,
  periodProgress,
  scoreRange,
  totalValue,
} from "./score";

const d = asDateStr;

// 2026-08-03 Pazartesi … 2026-08-09 Pazar
const MON = d("2026-08-03");
const TUE = d("2026-08-04");
const WED = d("2026-08-05");

describe("periodProgress — esnek rutinler", () => {
  it("haftalık dönemdeki tamamlanan günleri sayar", () => {
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    const e = entriesOn(r, { "2026-08-03": 1, "2026-08-05": 1 });

    const p = periodProgress(e, r, WED);
    expect(p).toMatchObject({
      done: 2,
      target: 3,
      per: "week",
      start: "2026-08-03",
      end: "2026-08-09",
      complete: false,
    });
  });

  it("hedef tutunca complete olur", () => {
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    const e = entriesOn(r, {
      "2026-08-03": 1,
      "2026-08-05": 1,
      "2026-08-07": 1,
    });
    expect(periodProgress(e, r, WED)?.complete).toBe(true);
  });

  it("hedefi aşmak da complete sayılır", () => {
    const r = routine({ schedule: { kind: "flexible", count: 2, per: "week" } });
    const e = completedRange(r, "2026-08-03", "2026-08-09");
    const p = periodProgress(e, r, WED);
    expect(p?.done).toBe(7);
    expect(p?.complete).toBe(true);
  });

  it("aylık dönemi doğru sınırlar", () => {
    const r = routine({ schedule: { kind: "flexible", count: 10, per: "month" } });
    const e = entriesOn(r, { "2026-07-31": 1, "2026-08-01": 1, "2026-08-15": 1 });

    const p = periodProgress(e, r, WED);
    expect(p?.done).toBe(2); // Temmuz'daki sayılmaz
    expect(p?.start).toBe("2026-08-01");
    expect(p?.end).toBe("2026-08-31");
  });

  it("esnek olmayan rutinde null döner", () => {
    const r = routine({ schedule: { kind: "daily" } });
    expect(periodProgress(noEntries, r, WED)).toBeNull();
  });

  it("kısmi ilerleme dönem sayımına girmez", () => {
    // Hedefi tutturmayan gün, dönem sayacını artırmaz.
    const r = routine({
      schedule: { kind: "flexible", count: 3, per: "week" },
      target: 8,
    });
    const e = entriesOn(r, { "2026-08-03": 8, "2026-08-04": 5 });
    expect(periodProgress(e, r, WED)?.done).toBe(1);
  });
});

describe("dayScore — gün düzeyi rutinler", () => {
  it("tek günlük rutin tamamlanınca tam skor", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const e = entriesOn(r, { "2026-08-05": 1 });
    expect(dayScore(e, [r], WED)).toMatchObject({
      earned: 1,
      possible: 1,
      ratio: 1,
    });
  });

  it("boş gün sıfır skor", () => {
    const r = routine({ schedule: { kind: "daily" } });
    expect(dayScore(noEntries, [r], WED)).toMatchObject({
      earned: 0,
      possible: 1,
      ratio: 0,
    });
  });

  it("kısmi ilerleme kesirli katkı yapar", () => {
    const r = routine({ schedule: { kind: "daily" }, target: 8 });
    const e = entriesOn(r, { "2026-08-05": 4 });
    expect(dayScore(e, [r], WED).ratio).toBeCloseTo(0.5);
  });

  it("zorunlu olmayan gün paydaya girmez", () => {
    // Salı zorunlu değil → o gün hiç puan yok, oran 0/0 = 0
    const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    expect(dayScore(noEntries, [r], TUE)).toMatchObject({
      possible: 0,
      ratio: 0,
    });
  });

  it("zorunlu olmayan günde yapılan iş oranı düşürmez", () => {
    const bonus = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    const daily = routine({ schedule: { kind: "daily" } });
    const e = mergeEntries(
      entriesOn(bonus, { "2026-08-04": 1 }), // bonus, Salı
      entriesOn(daily, { "2026-08-04": 1 }),
    );
    expect(dayScore(e, [bonus, daily], TUE).ratio).toBe(1);
  });

  it("birden fazla rutinin ortalamasını alır", () => {
    const a = routine({ schedule: { kind: "daily" } });
    const b = routine({ schedule: { kind: "daily" } });
    const e = entriesOn(a, { "2026-08-05": 1 });
    expect(dayScore(e, [a, b], WED).ratio).toBe(0.5);
  });

  it("pasif rutin skora girmez", () => {
    const active = routine({ schedule: { kind: "daily" } });
    const future = routine({ schedule: { kind: "daily" }, startDate: "2026-09-01" });
    const e = entriesOn(active, { "2026-08-05": 1 });
    expect(dayScore(e, [active, future], WED).ratio).toBe(1);
  });

  it("rutin yoksa oran 0", () => {
    expect(dayScore(noEntries, [], WED)).toMatchObject({ possible: 0, ratio: 0 });
  });
});

describe("dayScore — esnek rutinler", () => {
  it("dönem ilerlemesini güne paylaştırır", () => {
    // Haftada 3 kez, 0 yapılmış → her gün 1/7 yer kaplar, 0 kazanılır
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    const s = dayScore(noEntries, [r], WED);
    expect(s.possible).toBeCloseTo(1 / 7, 2);
    expect(s.earned).toBe(0);
  });

  it("dönem hedefi tutunca tam oran verir", () => {
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    const e = entriesOn(r, {
      "2026-08-03": 1,
      "2026-08-05": 1,
      "2026-08-07": 1,
    });
    expect(dayScore(e, [r], WED).ratio).toBe(1);
  });

  it("dönemin yarısı yapıldıysa oran yarımdır", () => {
    const r = routine({ schedule: { kind: "flexible", count: 4, per: "week" } });
    const e = entriesOn(r, { "2026-08-03": 1, "2026-08-04": 1 });
    expect(dayScore(e, [r], WED).ratio).toBeCloseTo(0.5);
  });

  it("aynı dönemin her günü aynı oranı gösterir (yumuşak ilerleme)", () => {
    // İşaretlenen günde sıçrayıp diğer günlerde sıfırlanmamalı.
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    const e = entriesOn(r, { "2026-08-03": 1 });
    const monRatio = dayScore(e, [r], MON).ratio;
    const wedRatio = dayScore(e, [r], WED).ratio;
    expect(monRatio).toBeCloseTo(wedRatio);
  });
});

describe("densityLevel", () => {
  it("sıfır oranı 0. seviyeye eşler", () => {
    expect(densityLevel(0)).toBe(0);
    expect(densityLevel(-1)).toBe(0);
  });

  it("tam oranı 4. seviyeye eşler", () => {
    expect(densityLevel(1)).toBe(4);
    expect(densityLevel(1.5)).toBe(4);
  });

  it("ara oranları kademelendirir", () => {
    expect(densityLevel(0.2)).toBe(1);
    expect(densityLevel(0.6)).toBe(2);
    expect(densityLevel(0.9)).toBe(3);
  });

  it("eşik sınırlarında tutarlıdır", () => {
    expect(densityLevel(0.49)).toBe(1);
    expect(densityLevel(0.5)).toBe(2);
    expect(densityLevel(0.74)).toBe(2);
    expect(densityLevel(0.75)).toBe(3);
    expect(densityLevel(0.99)).toBe(3);
  });

  it("dört seviye de gerçekçi bir dağılımda kullanılır", () => {
    // Regresyon koruması: eşikler öyle kaymamalı ki günlük oranlar
    // tek bir seviyeye yığılsın ve ısı haritası tekdüze görünsün.
    const sample = [0.3, 0.45, 0.55, 0.7, 0.8, 0.95, 1];
    const levels = new Set(sample.map(densityLevel));
    expect(levels.size).toBeGreaterThanOrEqual(4);
  });
});

describe("scoreRange", () => {
  it("aralıktaki her gün için skor üretir", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const e = entries(r, "2026-08-03", "X.X");
    const scores = scoreRange(e, [r], MON, WED);

    expect(scores.size).toBe(3);
    expect(scores.get(MON)?.ratio).toBe(1);
    expect(scores.get(TUE)?.ratio).toBe(0);
    expect(scores.get(WED)?.ratio).toBe(1);
  });
});

describe("completionRate", () => {
  it("günlük rutinde zorunlu günleri paydaya alır", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const e = entries(r, "2026-08-03", "XX.");
    expect(completionRate(e, r, MON, WED)).toMatchObject({
      done: 2,
      expected: 3,
    });
  });

  it("weekdays rutinde yalnızca zorunlu günleri sayar", () => {
    // 3-9 Ağustos: Pzt, Çrş, Cum zorunlu = 3 gün
    const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    const e = entriesOn(r, { "2026-08-03": 1, "2026-08-05": 1 });
    expect(completionRate(e, r, MON, d("2026-08-09"))).toMatchObject({
      done: 2,
      expected: 3,
    });
  });

  it("esnek rutinde dönem hedeflerini paydaya alır", () => {
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    const e = entriesOn(r, { "2026-08-03": 1, "2026-08-05": 1 });
    expect(completionRate(e, r, MON, d("2026-08-09"))).toMatchObject({
      done: 2,
      expected: 3,
    });
  });

  it("esnek rutinde her dönem bir kez sayılır", () => {
    // İki tam hafta: 2 × 3 = 6 beklenen
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    const e = entriesOn(r, {
      "2026-08-03": 1,
      "2026-08-05": 1,
      "2026-08-07": 1,
      "2026-08-10": 1,
    });
    expect(completionRate(e, r, MON, d("2026-08-16"))).toMatchObject({
      done: 4,
      expected: 6,
    });
  });

  it("hedefi aşan dönem paydayı şişirmez", () => {
    const r = routine({ schedule: { kind: "flexible", count: 2, per: "week" } });
    const e = completedRange(r, "2026-08-03", "2026-08-09");
    const result = completionRate(e, r, MON, d("2026-08-09"));
    expect(result.done).toBe(2); // 7 değil, hedefte kırpılır
    expect(result.rate).toBe(1);
  });

  it("pasif dönemde beklenti üretmez", () => {
    const r = routine({ schedule: { kind: "daily" }, startDate: "2026-08-05" });
    expect(completionRate(noEntries, r, MON, WED).expected).toBe(1);
  });
});

describe("totalValue", () => {
  it("aralıktaki değerleri toplar", () => {
    const r = routine({ target: 30, unit: "sayfa" });
    const e = entriesOn(r, { "2026-08-03": 30, "2026-08-04": 12, "2026-08-05": 45 });
    expect(totalValue(e, r, MON, WED)).toBe(87);
  });

  it("kayıt yoksa sıfırdır", () => {
    expect(totalValue(noEntries, routine(), MON, WED)).toBe(0);
  });
});
