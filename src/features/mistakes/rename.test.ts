import { describe, expect, it } from "vitest";
import { mistake } from "@/features/testing/fixtures";
import { planDersRename, planKonuRename } from "./rename";

describe("planDersRename", () => {
  it("Türkçe büyük/küçük harf farklarını tek grupta toplar", () => {
    // `normalize`'ın varlık sebebi: "MATEMATİK" küçültülünce noktalı
    // "i̇" üretir ve düz "matematik" ile eşleşmez.
    const list = [
      mistake({ id: "a", ders: "matematik" }),
      mistake({ id: "b", ders: "MATEMATİK" }),
      mistake({ id: "c", ders: "Matematik" }),
      mistake({ id: "d", ders: "Fizik" }),
    ];

    const plan = planDersRename(list, "Matematik", "Mat");

    expect(plan.ids.sort()).toEqual(["a", "b", "c"]);
    expect(plan.count).toBe(3);
  });

  it("yeni bir ada dönüşte birleştirme yoktur", () => {
    const plan = planDersRename(
      [mistake({ ders: "Matematik" })],
      "Matematik",
      "Mat",
    );

    expect(plan.merge).toBe(false);
    expect(plan.mergeIntoCount).toBe(0);
  });

  it("var olan bir ada dönüşte birleştirmeyi bildirir", () => {
    const list = [
      mistake({ id: "a", ders: "mat" }),
      mistake({ id: "b", ders: "Matematik" }),
      mistake({ id: "c", ders: "Matematik" }),
    ];

    const plan = planDersRename(list, "mat", "Matematik");

    expect(plan.merge).toBe(true);
    expect(plan.mergeIntoCount).toBe(2);
    // Hedefteki satırlar güncellenmez — adları zaten doğru.
    expect(plan.ids).toEqual(["a"]);
    expect(plan.count).toBe(1);
  });

  it("yalnızca yazım düzeltmesi birleştirme SAYILMAZ", () => {
    // "matematik" → "Matematik": normalleştirilmiş anahtar aynı, yani
    // ortada zaten tek dal var. Bu bir birleştirme değil.
    const list = [
      mistake({ id: "a", ders: "matematik" }),
      mistake({ id: "b", ders: "Matematik" }),
    ];

    const plan = planDersRename(list, "matematik", "Matematik");

    expect(plan.merge).toBe(false);
    // Adı zaten birebir doğru olan "b" listede yok.
    expect(plan.ids).toEqual(["a"]);
  });

  it("boş ya da yalnızca boşluktan oluşan hedefi reddeder", () => {
    const list = [mistake({ ders: "Matematik" })];

    expect(planDersRename(list, "Matematik", "").count).toBe(0);
    expect(planDersRename(list, "Matematik", "   ").count).toBe(0);
  });

  it("eşleşme yoksa boş plan döner", () => {
    const plan = planDersRename([mistake({ ders: "Fizik" })], "Kimya", "Kim");

    expect(plan.ids).toEqual([]);
    expect(plan.count).toBe(0);
  });
});

describe("planKonuRename", () => {
  it("yalnızca kendi dersi içindeki konuyu etkiler", () => {
    // "Türev" iki derste birden var; Matematik'inki değişmeli,
    // Fizik'inki dokunulmamalı.
    const list = [
      mistake({ id: "m1", ders: "Matematik", konu: "Türev" }),
      mistake({ id: "f1", ders: "Fizik", konu: "Türev" }),
    ];

    const plan = planKonuRename(list, "Matematik", "Türev", "Türev Alma");

    expect(plan.ids).toEqual(["m1"]);
  });

  it("ders içinde birleştirmeyi bildirir", () => {
    const list = [
      mistake({ id: "a", ders: "Matematik", konu: "türev" }),
      mistake({ id: "b", ders: "Matematik", konu: "Türev Alma" }),
      mistake({ id: "c", ders: "Fizik", konu: "Türev Alma" }),
    ];

    const plan = planKonuRename(list, "Matematik", "türev", "Türev Alma");

    expect(plan.merge).toBe(true);
    // Fizik'teki aynı adlı konu sayıma KATILMAZ: birleşme ders
    // içindedir.
    expect(plan.mergeIntoCount).toBe(1);
    expect(plan.ids).toEqual(["a"]);
  });

  it("konu adı büyük/küçük harf duyarsız eşleşir", () => {
    const list = [
      mistake({ id: "a", ders: "Matematik", konu: "LİMİT" }),
      mistake({ id: "b", ders: "Matematik", konu: "limit" }),
    ];

    const plan = planKonuRename(list, "Matematik", "Limit", "Limit ve Süreklilik");

    expect(plan.ids.sort()).toEqual(["a", "b"]);
  });

  it("boş hedefi reddeder", () => {
    const list = [mistake({ ders: "Matematik", konu: "Türev" })];
    expect(planKonuRename(list, "Matematik", "Türev", "  ").count).toBe(0);
  });
});
