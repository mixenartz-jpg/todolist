import { describe, expect, test } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { mistake } from "@/features/testing/fixtures";
import { buildTree } from "./tree";

const d = asDateStr;

// 2026-08-10 bir Pazartesi — ISO haftanın ilk günü.
const MONDAY = d("2026-08-10");

describe("buildTree — gruplama", () => {
  test("boş girdi boş döner", () => {
    expect(buildTree([], MONDAY)).toEqual([]);
  });

  test("ders ve konuya göre sayar", () => {
    const list = [
      mistake({ ders: "Matematik", konu: "Türev", date: "2026-08-10" }),
      mistake({ ders: "Matematik", konu: "Türev", date: "2026-08-11" }),
      mistake({ ders: "Matematik", konu: "İntegral", date: "2026-08-11" }),
      mistake({ ders: "Fizik", konu: "Hareket", date: "2026-08-11" }),
    ];

    const tree = buildTree(list, MONDAY);

    expect(tree).toHaveLength(2);
    expect(tree[0]).toMatchObject({ ders: "Matematik", total: 3, week: 3 });
    expect(tree[1]).toMatchObject({ ders: "Fizik", total: 1, week: 1 });
    expect(tree[0].konular.map((k) => [k.konu, k.week, k.total])).toEqual([
      ["Türev", 2, 2],
      ["İntegral", 1, 1],
    ]);
  });

  test("farklı yazımlar tek dalda birleşir", () => {
    const list = [
      mistake({ ders: "matematik", konu: "türev", date: "2026-08-10" }),
      mistake({ ders: "MATEMATİK", konu: "TÜREV", date: "2026-08-11" }),
      mistake({ ders: "Matematik", konu: "Türev", date: "2026-08-12" }),
    ];

    const tree = buildTree(list, MONDAY);

    expect(tree).toHaveLength(1);
    expect(tree[0].total).toBe(3);
    expect(tree[0].konular).toHaveLength(1);
    expect(tree[0].konular[0].mistakes).toHaveLength(3);
  });

  test("etiket EN SON kullanılan yazımdır", () => {
    const list = [
      mistake({ ders: "matematik", date: "2026-08-10" }),
      mistake({ ders: "MATEMATİK", date: "2026-08-11" }),
      mistake({ ders: "Matematik", date: "2026-08-12" }), // en yeni
    ];

    expect(buildTree(list, MONDAY)[0].ders).toBe("Matematik");
  });

  test("bu hafta ISO haftadır — kayan 7 gün DEĞİL", () => {
    // Pazartesi 10 Ağustos'ta duruyoruz. 9 Ağustos (önceki Pazar) geçen
    // haftaya aittir ve haftalık sayıya girmemeli.
    const list = [
      mistake({ date: "2026-08-09" }), // önceki Pazar
      mistake({ date: "2026-08-10" }), // bu Pazartesi
    ];

    const tree = buildTree(list, MONDAY);

    expect(tree[0].total).toBe(2);
    expect(tree[0].week).toBe(1);
  });

  test("toplamlar girdi uzunluğuna eşittir", () => {
    const list = [
      mistake({ ders: "A", konu: "x", date: "2026-08-10" }),
      mistake({ ders: "B", konu: "y", date: "2026-08-03" }),
      mistake({ ders: "A", konu: "z", date: "2026-07-01" }),
    ];

    const sum = buildTree(list, MONDAY).reduce((acc, t) => acc + t.total, 0);
    expect(sum).toBe(list.length);
  });

  test("ders toplamı konularının toplamına eşittir", () => {
    const list = [
      mistake({ ders: "Matematik", konu: "Türev" }),
      mistake({ ders: "Matematik", konu: "Türev" }),
      mistake({ ders: "Matematik", konu: "İntegral" }),
    ];

    const ders = buildTree(list, MONDAY)[0];
    const sum = ders.konular.reduce((acc, k) => acc + k.total, 0);
    expect(sum).toBe(ders.total);
  });

  test("anahtarlar normalleştirilmiştir ve dal içinde benzersizdir", () => {
    const list = [
      mistake({ ders: "Matematik", konu: "Türev" }),
      mistake({ ders: "matematik", konu: "TÜREV" }),
      mistake({ ders: "Fizik", konu: "Hareket" }),
    ];

    const tree = buildTree(list, MONDAY);
    const dersKeys = tree.map((t) => t.key);

    expect(new Set(dersKeys).size).toBe(dersKeys.length);
    expect(dersKeys).not.toContain("Matematik"); // ham etiket değil
  });

  test("aynı adlı konu farklı derslerde farklı nodeKey alır", () => {
    // "Türev" hem Matematik hem Fizik altında olabilir. nodeKey'ler
    // çakışsaydı birini açmak diğerini de açardı.
    const list = [
      mistake({ ders: "Matematik", konu: "Türev" }),
      mistake({ ders: "Fizik", konu: "Türev" }),
    ];

    const tree = buildTree(list, MONDAY);
    const nodeKeys = tree.flatMap((d) => d.konular.map((k) => k.nodeKey));

    expect(new Set(nodeKeys).size).toBe(2);
  });

  test("ders ve konu nodeKey'leri birbiriyle çakışmaz", () => {
    const list = [
      mistake({ ders: "Matematik", konu: "Türev" }),
      mistake({ ders: "Fizik", konu: "Hareket" }),
    ];

    const tree = buildTree(list, MONDAY);
    const all = tree.flatMap((d) => [d.nodeKey, ...d.konular.map((k) => k.nodeKey)]);

    expect(new Set(all).size).toBe(all.length);
  });
});

describe("buildTree — yanlışların sırası", () => {
  test("konu altındaki yanlışlar yeniden eskiye sıralıdır", () => {
    const list = [
      mistake({ id: "eski", date: "2026-08-01" }),
      mistake({ id: "yeni", date: "2026-08-12" }),
      mistake({ id: "orta", date: "2026-08-06" }),
    ];

    const konu = buildTree(list, MONDAY)[0].konular[0];
    expect(konu.mistakes.map((m) => m.id)).toEqual(["yeni", "orta", "eski"]);
  });

  test("aynı gündeki yanlışlar deterministik sıralanır", () => {
    const list = [
      mistake({ id: "b", date: "2026-08-10" }),
      mistake({ id: "a", date: "2026-08-10" }),
    ];

    const first = buildTree(list, MONDAY)[0].konular[0].mistakes.map((m) => m.id);
    const second = buildTree([...list].reverse(), MONDAY)[0].konular[0].mistakes.map(
      (m) => m.id,
    );

    expect(first).toEqual(second);
  });

  test("girdiyi mutate etmez", () => {
    const list = [
      mistake({ id: "a", date: "2026-08-01" }),
      mistake({ id: "b", date: "2026-08-12" }),
    ];
    const before = list.map((m) => m.id);

    buildTree(list, MONDAY);

    expect(list.map((m) => m.id)).toEqual(before);
  });
});

describe("buildTree — dueCount", () => {
  test("vadesi gelmiş yanlışları sayar", () => {
    const list = [
      mistake({ nextReviewDate: "2026-08-10" }), // tam bugün
      mistake({ nextReviewDate: "2026-08-20" }), // gelecek
    ];

    expect(buildTree(list, MONDAY)[0].dueCount).toBe(1);
  });

  test("vadesi GEÇMİŞ olanlar da sayılır", () => {
    const list = [mistake({ nextReviewDate: "2026-07-01" })];
    expect(buildTree(list, MONDAY)[0].dueCount).toBe(1);
  });

  test("mezun yanlışlar sayılmaz", () => {
    const list = [
      mistake({ reviewStage: 4, nextReviewDate: null }),
      mistake({ nextReviewDate: "2026-08-01" }),
    ];

    expect(buildTree(list, MONDAY)[0].dueCount).toBe(1);
  });

  test("ders dueCount'u konularının toplamıdır", () => {
    const list = [
      mistake({ konu: "Türev", nextReviewDate: "2026-08-01" }),
      mistake({ konu: "Türev", nextReviewDate: "2026-08-02" }),
      mistake({ konu: "İntegral", nextReviewDate: "2026-08-03" }),
      mistake({ konu: "İntegral", nextReviewDate: "2026-09-30" }),
    ];

    const ders = buildTree(list, MONDAY)[0];
    const sum = ders.konular.reduce((acc, k) => acc + k.dueCount, 0);

    expect(ders.dueCount).toBe(3);
    expect(sum).toBe(ders.dueCount);
  });

  test("vadesi gelen yoksa sıfırdır", () => {
    const list = [mistake({ nextReviewDate: "2026-12-31" })];
    expect(buildTree(list, MONDAY)[0].dueCount).toBe(0);
  });
});

describe("buildTree — heat", () => {
  test("en çok yanlış yapılan ders 4'tür", () => {
    const list = [
      mistake({ ders: "Matematik" }),
      mistake({ ders: "Matematik" }),
      mistake({ ders: "Matematik" }),
      mistake({ ders: "Fizik" }),
    ];

    const tree = buildTree(list, MONDAY);
    const matematik = tree.find((t) => t.ders === "Matematik")!;

    expect(matematik.heat).toBe(4);
  });

  test("tek ders varsa 4'tür", () => {
    expect(buildTree([mistake()], MONDAY)[0].heat).toBe(4);
  });

  test("eşit toplamlar eşit ısı alır", () => {
    const list = [
      mistake({ ders: "Matematik" }),
      mistake({ ders: "Fizik" }),
      mistake({ ders: "Kimya" }),
    ];

    const heats = buildTree(list, MONDAY).map((t) => t.heat);
    expect(new Set(heats).size).toBe(1);
  });

  test("ısı 1..4 aralığındadır — var olan dal asla 0 olmaz", () => {
    // 20'ye 1: oran %5, yuvarlama olmadan 0'a düşerdi. Var olan bir dalın
    // görünmez kalması yanlış olurdu.
    const list = [
      ...Array.from({ length: 20 }, () => mistake({ ders: "Matematik" })),
      mistake({ ders: "Fizik" }),
    ];

    const fizik = buildTree(list, MONDAY).find((t) => t.ders === "Fizik")!;
    expect(fizik.heat).toBe(1);
  });

  test("konu ısısı TÜM konular arasında normalleştirilir", () => {
    // Fizik'in tek konusu 1 yanlış içeriyor; kendi dersi içinde tek
    // olduğu için "en yoğun" sayılıp 4 olmamalı — Matematik/Türev 4 iken
    // Fizik/Hareket düşük kalmalı.
    const list = [
      ...Array.from({ length: 8 }, () => mistake({ ders: "Matematik", konu: "Türev" })),
      mistake({ ders: "Fizik", konu: "Hareket" }),
    ];

    const tree = buildTree(list, MONDAY);
    const turev = tree.find((t) => t.ders === "Matematik")!.konular[0];
    const hareket = tree.find((t) => t.ders === "Fizik")!.konular[0];

    expect(turev.heat).toBe(4);
    expect(hareket.heat).toBeLessThan(4);
    expect(hareket.heat).toBeGreaterThan(0);
  });

  test("ders ısısı ile konu ısısı bağımsız ölçeklenir", () => {
    // Tek ders → ders ısısı 4. Ama içindeki iki konudan küçük olanı
    // 4 olmamalı.
    const list = [
      ...Array.from({ length: 8 }, () => mistake({ ders: "Matematik", konu: "Türev" })),
      mistake({ ders: "Matematik", konu: "İntegral" }),
    ];

    const ders = buildTree(list, MONDAY)[0];
    const integral = ders.konular.find((k) => k.konu === "İntegral")!;

    expect(ders.heat).toBe(4);
    expect(integral.heat).toBeLessThan(4);
  });
});
