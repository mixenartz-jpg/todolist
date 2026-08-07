import { describe, expect, test } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { mistake } from "@/features/testing/fixtures";
import { buildTally, filterBySelection } from "./tally";

const d = asDateStr;

// 2026-08-10 bir Pazartesi — ISO haftanın ilk günü.
const MONDAY = d("2026-08-10");

describe("buildTally", () => {
  test("boş girdi boş döner", () => {
    expect(buildTally([], MONDAY)).toEqual([]);
  });

  test("ders ve konuya göre sayar", () => {
    const list = [
      mistake({ ders: "Matematik", konu: "Türev", date: "2026-08-10" }),
      mistake({ ders: "Matematik", konu: "Türev", date: "2026-08-11" }),
      mistake({ ders: "Matematik", konu: "İntegral", date: "2026-08-11" }),
      mistake({ ders: "Fizik", konu: "Hareket", date: "2026-08-11" }),
    ];

    const tally = buildTally(list, MONDAY);

    expect(tally).toHaveLength(2);
    expect(tally[0]).toMatchObject({ ders: "Matematik", total: 3 });
    expect(tally[1]).toMatchObject({ ders: "Fizik", total: 1 });
    expect(tally[0].konular).toEqual([
      { konu: "Türev", week: 2, total: 2 },
      { konu: "İntegral", week: 1, total: 1 },
    ]);
  });

  test("farklı yazımlar tek satırda birleşir", () => {
    const list = [
      mistake({ ders: "matematik", konu: "türev", date: "2026-08-10" }),
      mistake({ ders: "MATEMATİK", konu: "TÜREV", date: "2026-08-11" }),
      mistake({ ders: "Matematik", konu: "Türev", date: "2026-08-12" }),
    ];

    const tally = buildTally(list, MONDAY);

    expect(tally).toHaveLength(1);
    expect(tally[0].total).toBe(3);
    expect(tally[0].konular).toHaveLength(1);
  });

  test("etiket EN SON kullanılan yazımdır", () => {
    const list = [
      mistake({ ders: "matematik", date: "2026-08-10" }),
      mistake({ ders: "MATEMATİK", date: "2026-08-11" }),
      mistake({ ders: "Matematik", date: "2026-08-12" }), // en yeni
    ];

    expect(buildTally(list, MONDAY)[0].ders).toBe("Matematik");
  });

  test("bu hafta ISO haftadır — kayan 7 gün DEĞİL", () => {
    // Pazartesi 10 Ağustos'ta duruyoruz. 9 Ağustos (önceki Pazar) geçen
    // haftaya aittir ve haftalık sayıya girmemeli — kayan 7 günlük
    // pencere onu yanlışlıkla sayardı.
    const list = [
      mistake({ date: "2026-08-09" }), // önceki Pazar
      mistake({ date: "2026-08-10" }), // bu Pazartesi
    ];

    const tally = buildTally(list, MONDAY);

    expect(tally[0].total).toBe(2);
    expect(tally[0].week).toBe(1);
  });

  test("toplam sayıya göre azalan sıralanır", () => {
    const list = [
      mistake({ ders: "Fizik", date: "2026-08-10" }),
      mistake({ ders: "Matematik", date: "2026-08-10" }),
      mistake({ ders: "Matematik", date: "2026-08-10" }),
      mistake({ ders: "Kimya", date: "2026-08-10" }),
      mistake({ ders: "Kimya", date: "2026-08-10" }),
      mistake({ ders: "Kimya", date: "2026-08-10" }),
    ];

    expect(buildTally(list, MONDAY).map((t) => t.ders)).toEqual([
      "Kimya",
      "Matematik",
      "Fizik",
    ]);
  });

  test("beraberlik deterministik bozulur", () => {
    const list = [
      mistake({ ders: "Zooloji", date: "2026-08-10" }),
      mistake({ ders: "Astronomi", date: "2026-08-10" }),
    ];

    const first = buildTally(list, MONDAY).map((t) => t.ders);
    const second = buildTally([...list].reverse(), MONDAY).map((t) => t.ders);

    expect(first).toEqual(second);
    expect(first).toEqual(["Astronomi", "Zooloji"]);
  });

  test("toplamlar girdi uzunluğuna eşittir", () => {
    const list = [
      mistake({ ders: "A", konu: "x", date: "2026-08-10" }),
      mistake({ ders: "B", konu: "y", date: "2026-08-03" }),
      mistake({ ders: "A", konu: "z", date: "2026-07-01" }),
    ];

    const sum = buildTally(list, MONDAY).reduce((acc, t) => acc + t.total, 0);
    expect(sum).toBe(list.length);
  });
});

describe("filterBySelection", () => {
  const list = [
    mistake({ id: "a", ders: "Matematik", konu: "Türev" }),
    mistake({ id: "b", ders: "matematik", konu: "TÜREV" }),
    mistake({ id: "c", ders: "Matematik", konu: "İntegral" }),
    mistake({ id: "d", ders: "Fizik", konu: "Türev" }),
  ];

  test("seçim yoksa hepsi döner", () => {
    expect(filterBySelection(list, null)).toHaveLength(4);
  });

  test("ders ve konuya göre süzer, yazımdan bağımsız", () => {
    const result = filterBySelection(list, { ders: "MATEMATİK", konu: "türev" });
    expect(result.map((m) => m.id)).toEqual(["a", "b"]);
  });

  test("eşleşme yoksa boş döner", () => {
    expect(filterBySelection(list, { ders: "Tarih", konu: "İnkılap" })).toEqual([]);
  });
});
