import { describe, expect, it } from "vitest";
import { isoWeekday } from "@/lib/date/date";
import { monthGrid, toWeeks } from "./grid";

describe("monthGrid", () => {
  it("Pazartesi başlar, Pazar biter", () => {
    const cells = monthGrid(2026, 8);
    expect(isoWeekday(cells[0].date)).toBe(1);
    expect(isoWeekday(cells[cells.length - 1].date)).toBe(7);
  });

  it("uzunluğu daima 7'nin katıdır", () => {
    for (let month = 1; month <= 12; month++) {
      expect(monthGrid(2026, month).length % 7).toBe(0);
    }
  });

  it("ayın tüm günlerini içerir", () => {
    // Ağustos 2026: 31 gün
    const inMonth = monthGrid(2026, 8).filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].date).toBe("2026-08-01");
    expect(inMonth[30].date).toBe("2026-08-31");
  });

  it("komşu ay günlerini inMonth=false işaretler", () => {
    // 1 Ağustos 2026 Cumartesi → önünde Pzt-Cum (5 gün Temmuz'dan)
    const cells = monthGrid(2026, 8);
    const leading = cells.filter((c) => !c.inMonth && c.date < "2026-08-01");
    expect(leading).toHaveLength(5);
    expect(leading[0].date).toBe("2026-07-27");
  });

  it("Pazartesi başlayan ayda önde boşluk olmaz", () => {
    // 1 Haziran 2026 Pazartesi
    const cells = monthGrid(2026, 6);
    expect(cells[0].date).toBe("2026-06-01");
    expect(cells[0].inMonth).toBe(true);
  });

  it("artık yıl Şubat'ını doğru kapsar", () => {
    const inMonth = monthGrid(2024, 2).filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(29);
    expect(inMonth[28].date).toBe("2024-02-29");
  });

  it("yıl sınırını aşar", () => {
    // Ocak 2026: 1 Ocak Perşembe → önünde 3 gün Aralık 2025'ten
    const cells = monthGrid(2026, 1);
    expect(cells[0].date).toBe("2025-12-29");
    expect(cells[0].inMonth).toBe(false);
  });

  it("hücreler kronolojik ve kesintisizdir", () => {
    const cells = monthGrid(2026, 8);
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i].date > cells[i - 1].date).toBe(true);
    }
  });
});

describe("toWeeks", () => {
  it("yedişerli satırlara böler", () => {
    const weeks = toWeeks(monthGrid(2026, 8));
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("hücre sayısını korur", () => {
    const cells = monthGrid(2026, 8);
    expect(toWeeks(cells).flat()).toHaveLength(cells.length);
  });
});
