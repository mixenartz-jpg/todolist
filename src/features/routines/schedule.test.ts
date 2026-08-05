import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { routine } from "@/features/testing/fixtures";
import {
  describeSchedule,
  isActiveOn,
  isDueOn,
  isFlexibleOn,
  isNumeric,
  normalizeVersions,
  obligationAt,
  scheduleAt,
} from "./schedule";

const d = asDateStr;

// 2026-08-03 Pazartesi … 2026-08-09 Pazar
const MON = d("2026-08-03");
const TUE = d("2026-08-04");
const WED = d("2026-08-05");
const THU = d("2026-08-06");
const FRI = d("2026-08-07");
const SAT = d("2026-08-08");
const SUN = d("2026-08-09");

describe("scheduleAt — zaman içindeki program sürümü", () => {
  it("tek sürümlü rutinde o sürümü döndürür", () => {
    const r = routine({ schedule: { kind: "daily" } });
    expect(scheduleAt(r, WED)).toEqual({ kind: "daily" });
  });

  it("effective_from gününde YENİ program geçerlidir", () => {
    const r = routine({
      startDate: "2026-01-01",
      versions: [
        { from: "2026-01-01", schedule: { kind: "daily" } },
        { from: "2026-08-05", schedule: { kind: "weekdays", days: [1, 3, 5] } },
      ],
    });

    expect(scheduleAt(r, d("2026-08-04"))).toEqual({ kind: "daily" });
    // Tam geçiş gününde yeni program:
    expect(scheduleAt(r, d("2026-08-05"))).toEqual({
      kind: "weekdays",
      days: [1, 3, 5],
    });
    expect(scheduleAt(r, d("2026-08-06"))).toEqual({
      kind: "weekdays",
      days: [1, 3, 5],
    });
  });

  it("ilk sürümden önceki tarihte null döner", () => {
    const r = routine({
      startDate: "2026-08-01",
      versions: [{ from: "2026-08-01", schedule: { kind: "daily" } }],
    });
    expect(scheduleAt(r, d("2026-07-31"))).toBeNull();
  });

  it("iki kez değişmiş programda doğru sürümü seçer", () => {
    const r = routine({
      startDate: "2026-01-01",
      versions: [
        { from: "2026-01-01", schedule: { kind: "daily" } },
        { from: "2026-04-01", schedule: { kind: "weekdays", days: [1, 3, 5] } },
        { from: "2026-07-01", schedule: { kind: "flexible", count: 3, per: "week" } },
      ],
    });

    expect(scheduleAt(r, d("2026-02-15"))?.kind).toBe("daily");
    expect(scheduleAt(r, d("2026-05-15"))?.kind).toBe("weekdays");
    expect(scheduleAt(r, d("2026-08-15"))?.kind).toBe("flexible");
  });

  it("GEÇMİŞİ KORUR: program değişikliği eski günleri yeniden yorumlamaz", () => {
    // Bu, temporal tablonun var oluş sebebidir. Rutin Temmuz'a kadar
    // her gündü; Ağustos'ta Pzt/Çrş/Cum'a çevrildi. Temmuz'daki Salı
    // hâlâ zorunlu olmalıdır.
    const r = routine({
      startDate: "2026-01-01",
      versions: [
        { from: "2026-01-01", schedule: { kind: "daily" } },
        { from: "2026-08-01", schedule: { kind: "weekdays", days: [1, 3, 5] } },
      ],
    });

    expect(isDueOn(r, d("2026-07-07"))).toBe(true); // Temmuz Salısı: zorunluydu
    expect(isDueOn(r, TUE)).toBe(false); // Ağustos Salısı: artık değil
  });
});

describe("isActiveOn — başlangıç ve arşiv kapıları", () => {
  it("start_date öncesinde pasiftir", () => {
    const r = routine({ startDate: "2026-08-05" });
    expect(isActiveOn(r, d("2026-08-04"))).toBe(false);
    expect(isActiveOn(r, d("2026-08-05"))).toBe(true);
  });

  it("arşiv gününde ve sonrasında pasiftir", () => {
    const r = routine({ startDate: "2026-01-01", archivedAt: "2026-08-05" });
    expect(isActiveOn(r, d("2026-08-04"))).toBe(true);
    expect(isActiveOn(r, d("2026-08-05"))).toBe(false);
    expect(isActiveOn(r, d("2026-08-06"))).toBe(false);
  });

  it("arşivlenmemiş rutin gelecekte de aktiftir", () => {
    const r = routine({ startDate: "2026-01-01" });
    expect(isActiveOn(r, d("2030-01-01"))).toBe(true);
  });
});

describe("isDueOn — daily", () => {
  it("her gün zorunludur", () => {
    const r = routine({ schedule: { kind: "daily" } });
    for (const day of [MON, TUE, WED, THU, FRI, SAT, SUN]) {
      expect(isDueOn(r, day)).toBe(true);
    }
  });

  it("start_date öncesinde zorunlu değildir", () => {
    const r = routine({ schedule: { kind: "daily" }, startDate: "2026-08-05" });
    expect(isDueOn(r, TUE)).toBe(false);
    expect(isDueOn(r, WED)).toBe(true);
  });
});

describe("isDueOn — weekdays", () => {
  const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });

  it("yalnızca seçili günlerde zorunludur", () => {
    expect(isDueOn(r, MON)).toBe(true); // Pzt = 1
    expect(isDueOn(r, TUE)).toBe(false);
    expect(isDueOn(r, WED)).toBe(true); // Çrş = 3
    expect(isDueOn(r, THU)).toBe(false);
    expect(isDueOn(r, FRI)).toBe(true); // Cum = 5
    expect(isDueOn(r, SAT)).toBe(false);
    expect(isDueOn(r, SUN)).toBe(false);
  });

  it("Pazar'ı ISO numarasıyla (7) tanır", () => {
    const sunday = routine({ schedule: { kind: "weekdays", days: [7] } });
    expect(isDueOn(sunday, SUN)).toBe(true);
    expect(isDueOn(sunday, MON)).toBe(false);
  });

  it("hafta sonu rutinini doğru kurar", () => {
    const weekend = routine({ schedule: { kind: "weekdays", days: [6, 7] } });
    expect(isDueOn(weekend, SAT)).toBe(true);
    expect(isDueOn(weekend, SUN)).toBe(true);
    expect(isDueOn(weekend, MON)).toBe(false);
  });
});

describe("isDueOn — flexible", () => {
  it("HİÇBİR gün zorunlu değildir", () => {
    // Esnek rutinde yükümlülük dönem düzeyindedir; "bugün kaçırdım mı?"
    // sorusu anlamsızdır.
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    for (const day of [MON, TUE, WED, THU, FRI, SAT, SUN]) {
      expect(isDueOn(r, day)).toBe(false);
    }
  });
});

describe("obligationAt", () => {
  it("daily için gün düzeyi döner", () => {
    const r = routine({ schedule: { kind: "daily" } });
    expect(obligationAt(r, WED)).toEqual({ level: "day" });
  });

  it("weekdays için yalnızca seçili günlerde gün düzeyi döner", () => {
    const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    expect(obligationAt(r, WED)).toEqual({ level: "day" });
    expect(obligationAt(r, TUE)).toBeNull();
  });

  it("flexible için dönem düzeyi döner", () => {
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    expect(obligationAt(r, WED)).toEqual({
      level: "period",
      per: "week",
      count: 3,
    });
  });

  it("pasif rutinde null döner", () => {
    const r = routine({ startDate: "2026-09-01" });
    expect(obligationAt(r, WED)).toBeNull();
  });
});

describe("isFlexibleOn / isNumeric", () => {
  it("esnek programı tanır", () => {
    const flex = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    const daily = routine({ schedule: { kind: "daily" } });
    expect(isFlexibleOn(flex, WED)).toBe(true);
    expect(isFlexibleOn(daily, WED)).toBe(false);
  });

  it("sayısal hedefi tanır", () => {
    expect(isNumeric(routine({ target: 8, unit: "bardak" }))).toBe(true);
    expect(isNumeric(routine({ target: 30 }))).toBe(true);
    expect(isNumeric(routine({ target: 1 }))).toBe(false);
  });
});

describe("normalizeVersions", () => {
  it("sürümleri tarihe göre sıralar", () => {
    const sorted = normalizeVersions([
      { effectiveFrom: d("2026-08-01"), schedule: { kind: "daily" } },
      { effectiveFrom: d("2026-01-01"), schedule: { kind: "daily" } },
      { effectiveFrom: d("2026-04-01"), schedule: { kind: "daily" } },
    ]);
    expect(sorted.map((v) => v.effectiveFrom)).toEqual([
      "2026-01-01",
      "2026-04-01",
      "2026-08-01",
    ]);
  });

  it("aynı tarihli sürümlerden sonuncusunu tutar", () => {
    const result = normalizeVersions([
      { effectiveFrom: d("2026-08-01"), schedule: { kind: "daily" } },
      { effectiveFrom: d("2026-08-01"), schedule: { kind: "weekdays", days: [1] } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].schedule).toEqual({ kind: "weekdays", days: [1] });
  });
});

describe("describeSchedule — Türkçe açıklama", () => {
  it("günlük programı açıklar", () => {
    expect(describeSchedule({ kind: "daily" })).toBe("Her gün");
  });

  it("seçili günleri sıralı listeler", () => {
    expect(describeSchedule({ kind: "weekdays", days: [5, 1, 3] })).toBe(
      "Pzt, Çrş, Cum",
    );
  });

  it("yedi günün hepsi seçiliyse 'Her gün' der", () => {
    expect(
      describeSchedule({ kind: "weekdays", days: [1, 2, 3, 4, 5, 6, 7] }),
    ).toBe("Her gün");
  });

  it("esnek programı açıklar", () => {
    expect(describeSchedule({ kind: "flexible", count: 3, per: "week" })).toBe(
      "Haftada 3 kez",
    );
    expect(describeSchedule({ kind: "flexible", count: 10, per: "month" })).toBe(
      "Ayda 10 kez",
    );
  });
});
