import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { entries, entriesOn, noEntries, routine } from "@/features/testing/fixtures";
import {
  cellState,
  isCompleted,
  nextValue,
  progressOn,
  valueOn,
} from "./completion";

const d = asDateStr;

const MON = d("2026-08-03");
const TUE = d("2026-08-04");
const WED = d("2026-08-05");
const TODAY = WED;

describe("valueOn", () => {
  it("kayıtlı değeri döndürür", () => {
    const r = routine({ target: 8 });
    const e = entriesOn(r, { "2026-08-05": 5 });
    expect(valueOn(e, r, WED)).toBe(5);
  });

  it("kayıt yoksa 0 döndürür", () => {
    expect(valueOn(noEntries, routine(), WED)).toBe(0);
  });
});

describe("isCompleted — value >= target", () => {
  it("boolean rutinde kayıt varsa tamamlanmıştır", () => {
    const r = routine({ target: 1 });
    expect(isCompleted(entriesOn(r, { "2026-08-05": 1 }), r, WED)).toBe(true);
    expect(isCompleted(noEntries, r, WED)).toBe(false);
  });

  it("HEDEFE TAM EŞİTLİK tamamlanmış sayılır", () => {
    const r = routine({ target: 8 });
    expect(isCompleted(entriesOn(r, { "2026-08-05": 8 }), r, WED)).toBe(true);
  });

  it("hedefin altı tamamlanmış SAYILMAZ", () => {
    // Kullanıcı kararı: kısmi ilerleme seriyi korumaz.
    const r = routine({ target: 8 });
    expect(isCompleted(entriesOn(r, { "2026-08-05": 7 }), r, WED)).toBe(false);
    expect(isCompleted(entriesOn(r, { "2026-08-05": 1 }), r, WED)).toBe(false);
  });

  it("hedefin üstü de tamamlanmıştır", () => {
    const r = routine({ target: 8 });
    expect(isCompleted(entriesOn(r, { "2026-08-05": 12 }), r, WED)).toBe(true);
  });

  it("ondalıklı hedeflerde doğru çalışır", () => {
    const r = routine({ target: 2.5 });
    expect(isCompleted(entriesOn(r, { "2026-08-05": 2.5 }), r, WED)).toBe(true);
    expect(isCompleted(entriesOn(r, { "2026-08-05": 2.4 }), r, WED)).toBe(false);
  });
});

describe("progressOn", () => {
  it("oranı 0-1 arasında verir", () => {
    const r = routine({ target: 8 });
    expect(progressOn(entriesOn(r, { "2026-08-05": 4 }), r, WED)).toBe(0.5);
    expect(progressOn(noEntries, r, WED)).toBe(0);
  });

  it("hedefi aşan değeri 1'e kırpar", () => {
    const r = routine({ target: 8 });
    expect(progressOn(entriesOn(r, { "2026-08-05": 20 }), r, WED)).toBe(1);
  });
});

describe("cellState — matrisin görsel dili", () => {
  it("hedef tutunca 'done'", () => {
    const r = routine({ target: 1 });
    expect(cellState(entriesOn(r, { "2026-08-03": 1 }), r, MON, TODAY)).toBe("done");
  });

  it("kısmi kayıtta 'partial'", () => {
    const r = routine({ target: 8 });
    expect(cellState(entriesOn(r, { "2026-08-03": 5 }), r, MON, TODAY)).toBe(
      "partial",
    );
  });

  it("geçmiş zorunlu ve boşsa 'missed'", () => {
    const r = routine({ schedule: { kind: "daily" } });
    expect(cellState(noEntries, r, MON, TODAY)).toBe("missed");
  });

  it("bugün zorunlu ve boşsa 'empty' (henüz kaçırılmadı)", () => {
    const r = routine({ schedule: { kind: "daily" } });
    expect(cellState(noEntries, r, TODAY, TODAY)).toBe("empty");
  });

  it("gelecek zorunlu ve boşsa 'future' — eksiklik değildir", () => {
    // Ayın kalanını "yapılacak" gibi işaretlemek görsel gürültü yaratır
    // ve kaçırılmış günlerle karışır.
    const r = routine({ schedule: { kind: "daily" } });
    expect(cellState(noEntries, r, d("2026-08-20"), TODAY)).toBe("future");
    expect(cellState(noEntries, r, d("2026-12-31"), TODAY)).toBe("future");
  });

  it("zorunlu olmayan günde 'not-due'", () => {
    const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    expect(cellState(noEntries, r, TUE, TODAY)).toBe("not-due");
  });

  it("esnek rutinde tüm boş günler 'not-due'", () => {
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    expect(cellState(noEntries, r, MON, TODAY)).toBe("not-due");
  });

  it("esnek rutinde işaretlenen gün 'done' olur", () => {
    // Esnek rutinde herhangi bir gün işaretlenebilir; zorunlu
    // olmaması, kaydın gösterilmemesi anlamına gelmez.
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    expect(cellState(entriesOn(r, { "2026-08-03": 1 }), r, MON, TODAY)).toBe("done");
  });

  it("zorunlu olmayan günde bile kayıt varsa gösterilir", () => {
    const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    expect(cellState(entriesOn(r, { "2026-08-04": 1 }), r, TUE, TODAY)).toBe("done");
  });

  it("başlangıç öncesi 'inactive'", () => {
    const r = routine({ startDate: "2026-08-05" });
    expect(cellState(noEntries, r, MON, TODAY)).toBe("inactive");
  });

  it("arşiv sonrası 'inactive'", () => {
    const r = routine({ startDate: "2026-01-01", archivedAt: "2026-08-04" });
    expect(cellState(noEntries, r, WED, TODAY)).toBe("inactive");
  });

  it("desen fixture'ı ile bir haftayı doğru okur", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const e = entries(r, "2026-08-03", "XX.");
    const today = d("2026-08-06");

    expect(cellState(e, r, d("2026-08-03"), today)).toBe("done");
    expect(cellState(e, r, d("2026-08-04"), today)).toBe("done");
    expect(cellState(e, r, d("2026-08-05"), today)).toBe("missed");
  });
});

describe("nextValue — hücreye tıklanınca", () => {
  it("boolean rutinde toggle yapar", () => {
    expect(nextValue(0, 1)).toBe(1);
    expect(nextValue(1, 1)).toBe(0);
  });

  it("sayısal rutinde birer artırır", () => {
    expect(nextValue(0, 8)).toBe(1);
    expect(nextValue(5, 8)).toBe(6);
  });

  it("sayısal rutinde hedefe ulaşınca sıfırlar", () => {
    expect(nextValue(8, 8)).toBe(0);
    expect(nextValue(9, 8)).toBe(0);
  });
});
