import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { WeekPoint } from "./aggregate";
import { trendDelta } from "./trend";

function week(key: string, ratio: number): WeekPoint {
  return {
    key,
    start: asDateStr("2026-08-03"),
    end: asDateStr("2026-08-09"),
    ratio,
    earned: 0,
    possible: 0,
  };
}

describe("trendDelta", () => {
  it("son iki haftayı karşılaştırır", () => {
    const delta = trendDelta([
      week("2026-W30", 0.4),
      week("2026-W31", 0.5),
      week("2026-W32", 0.62),
    ]);

    expect(delta).not.toBeNull();
    expect(delta!.current).toBeCloseTo(0.62);
    expect(delta!.previous).toBeCloseTo(0.5);
    expect(delta!.delta).toBeCloseTo(0.12);
  });

  it("gerileme negatif delta verir", () => {
    const delta = trendDelta([week("2026-W31", 0.8), week("2026-W32", 0.55)]);

    expect(delta!.delta).toBeCloseTo(-0.25);
  });

  /*
   * Sınır vakası ve koçluğun temel kuralı: ölçülemeyen şey
   * söylenmez. Tek haftalık veride "öndesin" demek uydurmaktır.
   */
  it("tek hafta varsa null döner — karşılaştırma yapılamaz", () => {
    expect(trendDelta([week("2026-W32", 0.9)])).toBeNull();
  });

  it("hiç hafta yoksa null döner", () => {
    expect(trendDelta([])).toBeNull();
  });

  it("iki hafta aynıysa delta sıfırdır", () => {
    const delta = trendDelta([week("2026-W31", 0.6), week("2026-W32", 0.6)]);

    expect(delta!.delta).toBe(0);
  });
});
