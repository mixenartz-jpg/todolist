import { describe, expect, test } from "vitest";
import { nextSortOrder, normalizeTitleInput, pendingCount } from "./sort";
import { SHOPPING_TITLE_MAX, type ShoppingItem } from "./types";

function item(over: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: "i1",
    title: "Süt",
    completedAt: null,
    sortOrder: 0,
    ...over,
  };
}

describe("nextSortOrder", () => {
  test("boş listede sütunun veritabanı varsayılanını döner", () => {
    expect(nextSortOrder([])).toBe(0);
  });

  test("en büyük sıranın bir fazlasını döner", () => {
    const items = [
      item({ id: "a", sortOrder: 0 }),
      item({ id: "b", sortOrder: 1 }),
      item({ id: "c", sortOrder: 2 }),
    ];

    expect(nextSortOrder(items)).toBe(3);
  });

  test("ortadaki kalem silinince var olan bir sırayı tekrar üretmez", () => {
    // Deliğin asıl sebebi: `list.length` kullanılsaydı burada 2
    // dönerdi ve "c" ile çakışırdı.
    const items = [item({ id: "a", sortOrder: 0 }), item({ id: "c", sortOrder: 2 })];

    expect(nextSortOrder(items)).toBe(3);
  });

  test("liste sıralı gelmese de maksimumu bulur", () => {
    const items = [
      item({ id: "b", sortOrder: 5 }),
      item({ id: "a", sortOrder: 1 }),
      item({ id: "c", sortOrder: 3 }),
    ];

    expect(nextSortOrder(items)).toBe(6);
  });

  test("alınmış kalemler de sırayı ilerletir", () => {
    // İşaretlenen kalem listede KALIR, dolayısıyla sırasını da tutar.
    const items = [item({ id: "a", sortOrder: 4, completedAt: "2026-09-09T10:00:00Z" })];

    expect(nextSortOrder(items)).toBe(5);
  });
});

describe("normalizeTitleInput", () => {
  test("baştaki ve sondaki boşlukları atar", () => {
    expect(normalizeTitleInput("  Ekmek  ")).toBe("Ekmek");
  });

  test("boş girdi kaydedilmez", () => {
    expect(normalizeTitleInput("")).toBeNull();
  });

  test("yalnızca boşluktan oluşan girdi kaydedilmez", () => {
    expect(normalizeTitleInput("   ")).toBeNull();
  });

  test("sınırdaki başlık kabul edilir", () => {
    const title = "a".repeat(SHOPPING_TITLE_MAX);

    expect(normalizeTitleInput(title)).toBe(title);
  });

  test("sınırı aşan başlık KIRPILMAZ, reddedilir", () => {
    // Kırpmak, kullanıcının yazdığından farklı bir şeyi sessizce
    // kaydetmek olurdu.
    expect(normalizeTitleInput("a".repeat(SHOPPING_TITLE_MAX + 1))).toBeNull();
  });

  test("uzunluk kırpma SONRASI ölçülür", () => {
    const title = "a".repeat(SHOPPING_TITLE_MAX);

    expect(normalizeTitleInput(`  ${title}  `)).toBe(title);
  });
});

describe("pendingCount", () => {
  test("boş listede sıfır döner", () => {
    expect(pendingCount([])).toBe(0);
  });

  test("yalnızca alınmamışları sayar", () => {
    const items = [
      item({ id: "a" }),
      item({ id: "b", completedAt: "2026-09-09T10:00:00Z" }),
      item({ id: "c" }),
    ];

    expect(pendingCount(items)).toBe(2);
  });

  test("hepsi alınmışsa sıfır döner", () => {
    const items = [item({ id: "a", completedAt: "2026-09-09T10:00:00Z" })];

    expect(pendingCount(items)).toBe(0);
  });
});
