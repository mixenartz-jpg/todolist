import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import {
  completedRange,
  entries,
  entriesOn,
  noEntries,
  routine,
} from "@/features/testing/fixtures";
import { computeStreak, recentHistory } from "./streak";

const d = asDateStr;

// 2026-08-19 Çarşamba
const TODAY = d("2026-08-19");

describe("daily — gün bazlı seri", () => {
  it("ardışık günleri sayar", () => {
    const r = routine({ schedule: { kind: "daily" } });
    // 17, 18, 19 tamam
    const e = entries(r, "2026-08-17", "XXX");
    expect(computeStreak(e, r, TODAY)).toMatchObject({ current: 3, unit: "day" });
  });

  it("BUGÜN boşsa seri KIRILMAZ — gün bitmedi", () => {
    // Sabah 09:00'da "serin sıfırlandı" demek yanlıştır.
    const r = routine({ schedule: { kind: "daily" } });
    const e = entries(r, "2026-08-16", "XXX"); // 16,17,18 tamam; 19 boş
    expect(computeStreak(e, r, TODAY).current).toBe(3);
  });

  it("DÜN boşsa seri kırılır", () => {
    const r = routine({ schedule: { kind: "daily" } });
    // 16,17 tamam; 18 boş; 19 tamam
    const e = entriesOn(r, {
      "2026-08-16": 1,
      "2026-08-17": 1,
      "2026-08-19": 1,
    });
    expect(computeStreak(e, r, TODAY).current).toBe(1);
  });

  it("hiç kayıt yoksa seri sıfırdır", () => {
    const r = routine({ schedule: { kind: "daily" } });
    expect(computeStreak(noEntries, r, TODAY)).toMatchObject({
      current: 0,
      longest: 0,
    });
  });

  it("en uzun seriyi geçmişten bulur", () => {
    const r = routine({ schedule: { kind: "daily" } });
    // 5 günlük seri, kırılma, 2 günlük seri
    const e = entries(r, "2026-08-10", "XXXXX.XX");
    const result = computeStreak(e, r, d("2026-08-17"));
    expect(result.longest).toBe(5);
    expect(result.current).toBe(2);
  });

  it("mevcut seri en uzun seriden büyük olamaz", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const e = completedRange(r, "2026-08-15", "2026-08-19");
    const result = computeStreak(e, r, TODAY);
    expect(result.current).toBe(5);
    expect(result.longest).toBe(5);
  });

  it("start_date öncesi seriye girmez", () => {
    const r = routine({ schedule: { kind: "daily" }, startDate: "2026-08-18" });
    const e = completedRange(r, "2026-08-18", "2026-08-19");
    expect(computeStreak(e, r, TODAY).current).toBe(2);
  });

  it("kısmi ilerleme seriyi kırar", () => {
    // Kullanıcı kararı: 8 bardak hedefinde 5 bardak o günü tamamlamaz.
    const r = routine({ schedule: { kind: "daily" }, target: 8 });
    const e = entriesOn(r, {
      "2026-08-17": 8,
      "2026-08-18": 5, // hedefin altı
      "2026-08-19": 8,
    });
    expect(computeStreak(e, r, TODAY).current).toBe(1);
  });
});

describe("weekdays — zorunlu olmayan günler seriyi kırmaz", () => {
  // Pzt/Çrş/Cum rutini
  const mwf = { kind: "weekdays" as const, days: [1, 3, 5] as const };

  it("aradaki zorunsuz günler atlanır", () => {
    // 17 Pzt ✓, 18 Sal zorunsuz, 19 Çrş ✓ → seri 2
    const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    const e = entriesOn(r, { "2026-08-17": 1, "2026-08-19": 1 });
    expect(computeStreak(e, r, TODAY)).toMatchObject({ current: 2, unit: "day" });
  });

  it("hafta sonu seriyi kırmaz", () => {
    // 14 Cum ✓, 15-16 hafta sonu, 17 Pzt ✓, 19 Çrş ✓
    const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    const e = entriesOn(r, {
      "2026-08-14": 1,
      "2026-08-17": 1,
      "2026-08-19": 1,
    });
    expect(computeStreak(e, r, TODAY).current).toBe(3);
  });

  it("kaçırılan ZORUNLU gün seriyi kırar", () => {
    // 17 Pzt ✓, 19 Çrş boş... ama bugün 19, tolerans var.
    // O yüzden 21 Cuma'dan bakalım: 17 ✓, 19 boş, 21 ✓ → seri 1
    const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    const e = entriesOn(r, { "2026-08-17": 1, "2026-08-21": 1 });
    expect(computeStreak(e, r, d("2026-08-21")).current).toBe(1);
  });

  it("zorunsuz günde yapılan iş seriye eklenmez", () => {
    // Salı zorunlu değil; yapılması seriyi uzatmaz (ama kırmaz da).
    const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    const e = entriesOn(r, {
      "2026-08-17": 1,
      "2026-08-18": 1, // bonus, Salı
      "2026-08-19": 1,
    });
    expect(computeStreak(e, r, TODAY).current).toBe(2);
  });

  it("bugün zorunlu ve boşsa kırılmaz", () => {
    const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    // 14 Cum ✓, 17 Pzt ✓, 19 Çrş boş (bugün)
    const e = entriesOn(r, { "2026-08-14": 1, "2026-08-17": 1 });
    expect(computeStreak(e, r, TODAY).current).toBe(2);
  });

  void mwf;
});

describe("flexible — dönem bazlı seri", () => {
  it("birim HAFTA'dır, gün değil", () => {
    // Birimsiz "5" göstermek hatadır: kullanıcı gün sanar.
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    expect(computeStreak(noEntries, r, TODAY).unit).toBe("week");
  });

  it("aylık esnekte birim AY'dır", () => {
    const r = routine({ schedule: { kind: "flexible", count: 10, per: "month" } });
    expect(computeStreak(noEntries, r, TODAY).unit).toBe("month");
  });

  it("hedefi tutturulan ardışık haftaları sayar", () => {
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    // 10-16 Ağu haftası: 3 gün ✓ · 17-23 haftası: 3 gün ✓
    const e = entriesOn(r, {
      "2026-08-10": 1,
      "2026-08-12": 1,
      "2026-08-14": 1,
      "2026-08-17": 1,
      "2026-08-18": 1,
      "2026-08-19": 1,
    });
    expect(computeStreak(e, r, TODAY).current).toBe(2);
  });

  it("İÇİNDE BULUNULAN dönem hedefi tutmasa da seriyi KIRMAZ", () => {
    // Hafta henüz bitmedi; 1/3 yapılmış olması geçmiş seriyi silmemeli.
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    const e = entriesOn(r, {
      // önceki hafta tam
      "2026-08-10": 1,
      "2026-08-12": 1,
      "2026-08-14": 1,
      // bu hafta yalnızca 1
      "2026-08-17": 1,
    });
    expect(computeStreak(e, r, TODAY).current).toBe(1);
  });

  it("GEÇMİŞ dönem hedefi tutmazsa seri kırılır", () => {
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    const e = entriesOn(r, {
      "2026-08-03": 1, // 2 hafta önce: 1/3 → kırık
      "2026-08-10": 1,
      "2026-08-12": 1,
      "2026-08-14": 1, // geçen hafta: 3/3 ✓
      "2026-08-17": 1,
      "2026-08-18": 1,
      "2026-08-19": 1, // bu hafta: 3/3 ✓
    });
    expect(computeStreak(e, r, TODAY).current).toBe(2);
  });

  it("hedefi aşmak da tamamlanmış sayılır", () => {
    const r = routine({ schedule: { kind: "flexible", count: 2, per: "week" } });
    const e = completedRange(r, "2026-08-17", "2026-08-19");
    expect(computeStreak(e, r, TODAY).current).toBe(1);
  });

  it("hiç yapılmamışsa seri sıfırdır", () => {
    const r = routine({ schedule: { kind: "flexible", count: 3, per: "week" } });
    expect(computeStreak(noEntries, r, TODAY).current).toBe(0);
  });

  it("en uzun dönem serisini bulur", () => {
    const r = routine({ schedule: { kind: "flexible", count: 1, per: "week" } });
    // 4 hafta üst üste 1'er kez
    const e = entriesOn(r, {
      "2026-07-27": 1,
      "2026-08-03": 1,
      "2026-08-10": 1,
      "2026-08-17": 1,
    });
    expect(computeStreak(e, r, TODAY).longest).toBe(4);
  });
});

describe("program değişimini kapsayan seri", () => {
  it("günlükten haftalığa geçişte eski günler eski kurala göre sayılır", () => {
    // 1-16 Ağustos her gün, 17'den itibaren Pzt/Çrş/Cum
    const r = routine({
      startDate: "2026-08-01",
      versions: [
        { from: "2026-08-01", schedule: { kind: "daily" } },
        { from: "2026-08-17", schedule: { kind: "weekdays", days: [1, 3, 5] } },
      ],
    });
    // 14,15,16 her gün zorunluydu ve yapıldı; 17 Pzt ✓, 19 Çrş ✓
    const e = entriesOn(r, {
      "2026-08-14": 1,
      "2026-08-15": 1,
      "2026-08-16": 1,
      "2026-08-17": 1,
      "2026-08-19": 1,
    });
    // 18 Salı artık zorunlu değil → seri kırılmaz: 14,15,16,17,19 = 5
    expect(computeStreak(e, r, TODAY).current).toBe(5);
  });

  it("bugünkü program esnekse birim dönemdir", () => {
    const r = routine({
      startDate: "2026-01-01",
      versions: [
        { from: "2026-01-01", schedule: { kind: "daily" } },
        { from: "2026-08-01", schedule: { kind: "flexible", count: 2, per: "week" } },
      ],
    });
    expect(computeStreak(noEntries, r, TODAY).unit).toBe("week");
  });
});

describe("arşivlenmiş rutin", () => {
  it("arşiv sonrası günler seriye girmez", () => {
    const r = routine({
      schedule: { kind: "daily" },
      startDate: "2026-08-01",
      archivedAt: "2026-08-18",
    });
    const e = completedRange(r, "2026-08-15", "2026-08-17");
    // 18'den itibaren pasif → 15,16,17 sayılır
    expect(computeStreak(e, r, TODAY).current).toBe(3);
  });
});

describe("recentHistory", () => {
  it("istenen sayıda günü kronolojik verir", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const history = recentHistory(noEntries, r, TODAY, 7);
    expect(history).toHaveLength(7);
    expect(history[0].date).toBe("2026-08-13");
    expect(history[6].date).toBe("2026-08-19");
  });

  it("zorunluluk ve tamamlanmayı işaretler", () => {
    const r = routine({ schedule: { kind: "weekdays", days: [1, 3, 5] } });
    const e = entriesOn(r, { "2026-08-17": 1 });
    const history = recentHistory(e, r, TODAY, 3);
    // 17 Pzt (zorunlu, yapıldı), 18 Sal (zorunsuz), 19 Çrş (zorunlu, boş)
    expect(history[0]).toMatchObject({ due: true, done: true });
    expect(history[1]).toMatchObject({ due: false, done: false });
    expect(history[2]).toMatchObject({ due: true, done: false });
  });
});
