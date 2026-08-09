import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { formatWeekRange } from "./tr";

describe("formatWeekRange", () => {
  it("aynı ay içindeki haftada ay adını tek kez yazar", () => {
    expect(formatWeekRange(asDateStr("2026-08-03"), asDateStr("2026-08-09"))).toBe(
      "3–9 Ağustos",
    );
  });

  it("ay geçen haftada iki ayı da yazar, yılı yazmaz", () => {
    expect(formatWeekRange(asDateStr("2026-09-28"), asDateStr("2026-10-04"))).toBe(
      "28 Eylül – 4 Ekim",
    );
  });

  it("yıl geçen haftada yılları da yazar", () => {
    expect(formatWeekRange(asDateStr("2026-12-28"), asDateStr("2027-01-03"))).toBe(
      "28 Aralık 2026 – 3 Ocak 2027",
    );
  });
});
