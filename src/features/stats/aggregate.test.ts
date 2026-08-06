import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import {
  completedRange,
  entriesOn,
  mergeEntries,
  noEntries,
  routine,
} from "@/features/testing/fixtures";
import {
  hasAnyCompletion,
  heatmapData,
  overallStats,
  relevantRoutines,
  routineSummaries,
  weekdayBreakdown,
  weeklyTrend,
} from "./aggregate";

const d = asDateStr;
const TODAY = d("2026-08-19");

describe("weeklyTrend", () => {
  it("haftalık kovalara toplar", () => {
    const r = routine({ schedule: { kind: "daily" } });
    // 10-16 Ağustos haftası: 7 günün 7'si
    const e = completedRange(r, "2026-08-10", "2026-08-16");
    const points = weeklyTrend(e, [r], d("2026-08-10"), d("2026-08-16"));

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ key: "2026-W33", ratio: 1 });
  });

  it("noktaları kronolojik sıralar", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const e = completedRange(r, "2026-08-03", "2026-08-23");
    const points = weeklyTrend(e, [r], d("2026-08-03"), d("2026-08-23"));

    expect(points.length).toBeGreaterThan(1);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].start > points[i - 1].start).toBe(true);
    }
  });

  it("yarım hafta oranı doğru hesaplar", () => {
    const r = routine({ schedule: { kind: "daily" } });
    // 7 günün 3'ü
    const e = entriesOn(r, {
      "2026-08-10": 1,
      "2026-08-11": 1,
      "2026-08-12": 1,
    });
    const points = weeklyTrend(e, [r], d("2026-08-10"), d("2026-08-16"));
    expect(points[0].ratio).toBeCloseTo(3 / 7);
  });

  it("iş olmayan haftaları atlar", () => {
    const r = routine({ schedule: { kind: "daily" }, startDate: "2026-08-17" });
    // 10-16 aralığında rutin henüz başlamamış → nokta üretilmez
    const points = weeklyTrend(noEntries, [r], d("2026-08-10"), d("2026-08-16"));
    expect(points).toEqual([]);
  });

  it("yıl sınırındaki haftaları doğru anahtarlar", () => {
    const r = routine({ schedule: { kind: "daily" }, startDate: "2025-01-01" });
    const e = completedRange(r, "2025-12-29", "2026-01-04");
    const points = weeklyTrend(e, [r], d("2025-12-29"), d("2026-01-04"));
    expect(points[0].key).toBe("2026-W01");
  });
});

describe("routineSummaries", () => {
  it("her rutin için oran ve seri üretir", () => {
    const a = routine({ id: "a", name: "Spor", schedule: { kind: "daily" } });
    const b = routine({ id: "b", name: "Kitap", schedule: { kind: "daily" } });
    const e = mergeEntries(
      completedRange(a, "2026-08-17", "2026-08-19"),
      entriesOn(b, { "2026-08-19": 1 }),
    );

    const summaries = routineSummaries(e, [a, b], d("2026-08-17"), TODAY, TODAY);
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toMatchObject({ done: 3, expected: 3, rate: 1 });
    expect(summaries[0].streak.current).toBe(3);
    expect(summaries[1].done).toBe(1);
  });

  it("sayısal rutinde toplamı verir", () => {
    const r = routine({ target: 30, unit: "sayfa", schedule: { kind: "daily" } });
    const e = entriesOn(r, { "2026-08-18": 30, "2026-08-19": 45 });
    const [summary] = routineSummaries(e, [r], d("2026-08-18"), TODAY, TODAY);
    expect(summary.total).toBe(75);
  });

  it("boolean rutinde toplam null'dır", () => {
    const r = routine({ target: 1 });
    const [summary] = routineSummaries(noEntries, [r], d("2026-08-18"), TODAY, TODAY);
    expect(summary.total).toBeNull();
  });

  it("esnek rutinde seri birimi haftadır", () => {
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    const [summary] = routineSummaries(noEntries, [r], d("2026-08-01"), TODAY, TODAY);
    expect(summary.streak.unit).toBe("week");
  });
});

describe("overallStats", () => {
  it("kusursuz günleri sayar", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const e = completedRange(r, "2026-08-17", "2026-08-19");
    const stats = overallStats(e, [r], d("2026-08-17"), TODAY, TODAY);

    expect(stats.perfectDays).toBe(3);
    expect(stats.activeDays).toBe(3);
    expect(stats.rate).toBe(1);
  });

  it("kusursuz gün serisini bulur", () => {
    const r = routine({ schedule: { kind: "daily" } });
    // 3 gün tam, 1 gün boş, 2 gün tam
    const e = entriesOn(r, {
      "2026-08-13": 1,
      "2026-08-14": 1,
      "2026-08-15": 1,
      "2026-08-18": 1,
      "2026-08-19": 1,
    });
    const stats = overallStats(e, [r], d("2026-08-13"), TODAY, TODAY);
    expect(stats.bestDayStreak).toBe(3);
  });

  it("GELECEK günleri kusursuz saymaz", () => {
    // Yaşanmamış bir gün "kusursuz" olamaz.
    const r = routine({ schedule: { kind: "daily" } });
    const e = completedRange(r, "2026-08-18", "2026-08-19");
    const stats = overallStats(e, [r], d("2026-08-18"), d("2026-08-25"), TODAY);
    expect(stats.perfectDays).toBe(2);
  });

  it("en yüksek seriyi ve sahibini bulur", () => {
    const a = routine({ id: "a", name: "Uzun", schedule: { kind: "daily" } });
    const b = routine({ id: "b", name: "Kısa", schedule: { kind: "daily" } });
    const e = mergeEntries(
      completedRange(a, "2026-08-15", "2026-08-19"),
      entriesOn(b, { "2026-08-19": 1 }),
    );

    const stats = overallStats(e, [a, b], d("2026-08-15"), TODAY, TODAY);
    expect(stats.topStreak?.routine.name).toBe("Uzun");
    expect(stats.topStreak?.streak.current).toBe(5);
  });

  it("hiç seri yoksa topStreak null'dır", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const stats = overallStats(noEntries, [r], d("2026-08-15"), TODAY, TODAY);
    expect(stats.topStreak).toBeNull();
  });

  it("rutin yoksa güvenle sıfır döner", () => {
    const stats = overallStats(noEntries, [], d("2026-08-15"), TODAY, TODAY);
    expect(stats).toMatchObject({ rate: 0, perfectDays: 0, activeDays: 0 });
  });
});

describe("heatmapData", () => {
  it("geçmiş günlere oran verir", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const e = completedRange(r, "2026-08-18", "2026-08-19");
    const map = heatmapData(e, [r], d("2026-08-18"), TODAY, TODAY);
    expect(map.get(d("2026-08-18"))).toBe(1);
  });

  it("GELECEK günlere null verir — %0 'kaçırılmış' izlenimi yaratır", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const map = heatmapData(noEntries, [r], TODAY, d("2026-08-25"), TODAY);
    expect(map.get(d("2026-08-25"))).toBeNull();
    expect(map.get(TODAY)).toBe(0);
  });

  it("iş olmayan güne null verir", () => {
    const r = routine({ schedule: { kind: "weekdays", days: [1] } });
    // 19 Çarşamba — zorunlu değil
    const map = heatmapData(noEntries, [r], TODAY, TODAY, TODAY);
    expect(map.get(TODAY)).toBeNull();
  });
});

describe("weekdayBreakdown", () => {
  it("yedi gün için de sonuç döner", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const result = weekdayBreakdown(noEntries, [r], d("2026-08-13"), TODAY);
    expect(result).toHaveLength(7);
    expect(result.map((x) => x.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("günlere göre oranı ayırır", () => {
    const r = routine({ schedule: { kind: "daily" } });
    // Yalnızca Pazartesileri yap: 2026-08-10 ve 2026-08-17 Pazartesi
    const e = entriesOn(r, { "2026-08-10": 1, "2026-08-17": 1 });
    const result = weekdayBreakdown(e, [r], d("2026-08-10"), d("2026-08-18"));

    const monday = result.find((x) => x.weekday === 1);
    const tuesday = result.find((x) => x.weekday === 2);
    expect(monday?.ratio).toBe(1);
    expect(tuesday?.ratio).toBe(0);
  });
});

describe("relevantRoutines", () => {
  it("aralıkta yaşamayan rutini eler", () => {
    const active = routine({ id: "a", startDate: "2026-01-01" });
    const future = routine({ id: "b", startDate: "2027-01-01" });
    const result = relevantRoutines([active, future], d("2026-08-01"), TODAY);
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("aralıkta arşivlenmiş olanı tutar", () => {
    // Geçmişi hâlâ anlamlı.
    const r = routine({ id: "a", startDate: "2026-01-01", archivedAt: "2026-08-10" });
    expect(relevantRoutines([r], d("2026-08-01"), TODAY)).toHaveLength(1);
  });
});

describe("hasAnyCompletion", () => {
  it("hiç tamamlanmamışsa false", () => {
    const r = routine();
    expect(hasAnyCompletion(noEntries, r, d("2026-08-01"), TODAY)).toBe(false);
  });

  it("tek gün bile tamamlandıysa true", () => {
    const r = routine();
    const e = entriesOn(r, { "2026-08-05": 1 });
    expect(hasAnyCompletion(e, r, d("2026-08-01"), TODAY)).toBe(true);
  });
});
