import { describe, expect, test } from "vitest";
import { mistake } from "@/features/testing/fixtures";
import { dersSuggestions, konuSuggestions, MAX_SUGGESTIONS } from "./suggest";

describe("dersSuggestions", () => {
  test("boş girdi boş döner", () => {
    expect(dersSuggestions([], "")).toEqual([]);
  });

  test("sıklığa göre azalan sıralar", () => {
    const list = [
      mistake({ ders: "Fizik" }),
      mistake({ ders: "Matematik" }),
      mistake({ ders: "Matematik" }),
      mistake({ ders: "Matematik" }),
      mistake({ ders: "Kimya" }),
      mistake({ ders: "Kimya" }),
    ];

    expect(dersSuggestions(list, "")).toEqual(["Matematik", "Kimya", "Fizik"]);
  });

  test("farklı yazımlar tek öneriye iner", () => {
    const list = [
      mistake({ ders: "matematik" }),
      mistake({ ders: "MATEMATİK" }),
      mistake({ ders: "Matematik" }),
    ];

    expect(dersSuggestions(list, "")).toHaveLength(1);
  });

  test("etiket ilk görülen (en yeni) yazımdır", () => {
    // Çağıran liste yeniden eskiye sıralı verir.
    const list = [mistake({ ders: "Matematik" }), mistake({ ders: "matematik" })];
    expect(dersSuggestions(list, "")).toEqual(["Matematik"]);
  });

  test("sorgu normalleştirilmiş alt dize ile eşleşir", () => {
    const list = [
      mistake({ ders: "Matematik" }),
      mistake({ ders: "Fizik" }),
      mistake({ ders: "Tarih" }),
    ];

    expect(dersSuggestions(list, "mat")).toEqual(["Matematik"]);
    // Aksansız yazım aksanlıyı bulmalı.
    expect(dersSuggestions([mistake({ ders: "Coğrafya" })], "cografya")).toEqual([
      "Coğrafya",
    ]);
  });

  test("liste MAX_SUGGESTIONS ile sınırlanır", () => {
    const list = Array.from({ length: 20 }, (_, i) =>
      mistake({ ders: `Ders ${i}` }),
    );

    expect(dersSuggestions(list, "")).toHaveLength(MAX_SUGGESTIONS);
  });

  test("boşluktan ibaret değerler atlanır", () => {
    const list = [mistake({ ders: "   " }), mistake({ ders: "Fizik" })];
    expect(dersSuggestions(list, "")).toEqual(["Fizik"]);
  });
});

describe("konuSuggestions", () => {
  const list = [
    mistake({ ders: "Matematik", konu: "Türev" }),
    mistake({ ders: "Matematik", konu: "İntegral" }),
    mistake({ ders: "Tarih", konu: "İnkılap" }),
  ];

  test("yalnızca o dersin konularını döner", () => {
    expect(konuSuggestions(list, "Matematik", "")).toEqual(["İntegral", "Türev"]);
  });

  test("ders eşleşmesi yazımdan bağımsızdır", () => {
    expect(konuSuggestions(list, "MATEMATİK", "")).toEqual(["İntegral", "Türev"]);
  });

  test("tanınmayan ders TÜM konuları döner", () => {
    // Yepyeni bir ders yazarken ölü bir açılır liste göstermek yerine
    // yazım tutarlılığı için tutamak sağlanır.
    const result = konuSuggestions(list, "Biyoloji", "");
    expect(result).toContain("Türev");
    expect(result).toContain("İnkılap");
  });

  test("ders boşsa tüm konular döner", () => {
    expect(konuSuggestions(list, "", "")).toHaveLength(3);
  });

  test("sorgu ders süzmesinden sonra uygulanır", () => {
    expect(konuSuggestions(list, "Matematik", "tur")).toEqual(["Türev"]);
  });
});
