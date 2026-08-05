import { describe, expect, it } from "vitest";
import { asDateStr } from "./date";
import {
  isoWeekParts,
  monthKey,
  periodKey,
  periodLength,
  periodRange,
  previousPeriod,
  weekKey,
} from "./period";

const d = asDateStr;

describe("isoWeekParts / weekKey — yıl sınırı", () => {
  // ISO-8601'in en kolay yanlış yapılan kısmı: yıl sonu/başı haftaları
  // komşu yıla ait olabilir.
  it("normal bir haftayı doğru numaralar", () => {
    // 2026-01-05 Pazartesi, 2026'nın 2. haftası
    expect(weekKey(d("2026-01-05"))).toBe("2026-W02");
  });

  it("4 Ocak daima 1. haftadadır", () => {
    expect(isoWeekParts(d("2026-01-04")).week).toBe(1);
    expect(isoWeekParts(d("2025-01-04")).week).toBe(1);
    expect(isoWeekParts(d("2024-01-04")).week).toBe(1);
  });

  it("29 Aralık 2025 ertesi yılın 1. haftasına düşer", () => {
    // 2025-12-29 Pazartesi; o haftanın Perşembe'si 2026-01-01 → ISO yıl 2026
    expect(weekKey(d("2025-12-29"))).toBe("2026-W01");
    expect(weekKey(d("2025-12-31"))).toBe("2026-W01");
    expect(weekKey(d("2026-01-01"))).toBe("2026-W01");
  });

  it("1 Ocak önceki yılın son haftasına düşebilir", () => {
    // 2027-01-01 Cuma; haftanın Perşembe'si 2026-12-31 → ISO yıl 2026
    expect(weekKey(d("2027-01-01"))).toBe("2026-W53");
  });

  it("53 haftalı yılları tanır", () => {
    // 2026 ISO takviminde 53 hafta vardır (1 Ocak Perşembe)
    expect(isoWeekParts(d("2026-12-31")).week).toBe(53);
  });

  it("aynı haftanın tüm günleri aynı anahtarı alır", () => {
    const week = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06",
                  "2026-08-07", "2026-08-08", "2026-08-09"];
    const keys = new Set(week.map((x) => weekKey(d(x))));
    expect(keys.size).toBe(1);
  });

  it("ardışık haftalar farklı anahtar alır", () => {
    expect(weekKey(d("2026-08-09"))).not.toBe(weekKey(d("2026-08-10")));
  });

  it("hafta numarasını iki haneye tamamlar", () => {
    expect(weekKey(d("2026-01-08"))).toBe("2026-W02");
  });
});

describe("monthKey", () => {
  it("yıl-ay anahtarı üretir", () => {
    expect(monthKey(d("2026-08-05"))).toBe("2026-08");
    expect(monthKey(d("2026-01-31"))).toBe("2026-01");
  });

  it("aynı ayın tüm günleri aynı anahtarı alır", () => {
    expect(monthKey(d("2026-08-01"))).toBe(monthKey(d("2026-08-31")));
  });
});

describe("periodKey", () => {
  it("döneme göre doğru anahtarı seçer", () => {
    expect(periodKey(d("2026-08-05"), "week")).toBe("2026-W32");
    expect(periodKey(d("2026-08-05"), "month")).toBe("2026-08");
  });
});

describe("periodRange", () => {
  it("hafta aralığını Pazartesi-Pazar verir", () => {
    expect(periodRange(d("2026-08-05"), "week")).toEqual({
      start: "2026-08-03",
      end: "2026-08-09",
    });
  });

  it("ay aralığını verir", () => {
    expect(periodRange(d("2026-08-05"), "month")).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
  });

  it("artık yıl Şubat'ını doğru bitirir", () => {
    expect(periodRange(d("2024-02-10"), "month").end).toBe("2024-02-29");
  });
});

describe("previousPeriod", () => {
  it("bir önceki haftaya götürür", () => {
    const prev = previousPeriod(d("2026-08-05"), "week");
    expect(weekKey(prev)).toBe("2026-W31");
  });

  it("bir önceki aya götürür", () => {
    const prev = previousPeriod(d("2026-08-05"), "month");
    expect(monthKey(prev)).toBe("2026-07");
  });

  it("yıl sınırını aşar", () => {
    expect(monthKey(previousPeriod(d("2026-01-15"), "month"))).toBe("2025-12");
  });
});

describe("periodLength", () => {
  it("hafta daima 7 gündür", () => {
    expect(periodLength(d("2026-08-05"), "week")).toBe(7);
    expect(periodLength(d("2026-12-31"), "week")).toBe(7);
  });

  it("ay uzunluğu aya göre değişir", () => {
    expect(periodLength(d("2026-08-05"), "month")).toBe(31);
    expect(periodLength(d("2026-04-05"), "month")).toBe(30);
    expect(periodLength(d("2026-02-05"), "month")).toBe(28);
    expect(periodLength(d("2024-02-05"), "month")).toBe(29);
  });
});
