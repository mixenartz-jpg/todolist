import { describe, expect, it } from "vitest";
import { category } from "@/features/testing/fixtures";
import {
  CATEGORY_NAME_MAX,
  GOAL_TITLE_MAX,
  isDuplicateCategoryName,
  normalizeCategoryName,
  normalizeGoalTitle,
  parseTargetCount,
  stepDoneCount,
} from "./goal";

describe("normalizeGoalTitle", () => {
  it("baştaki ve sondaki boşluğu kırpar", () => {
    expect(normalizeGoalTitle("  30 deneme  ")).toBe("30 deneme");
  });

  it("boş ve yalnızca boşluklu girdide null döner", () => {
    // Başlıksız hedef diye bir şey yok; boş string'i geçerli sayıp
    // göndermek DB kısıt hatası demekti.
    expect(normalizeGoalTitle("")).toBeNull();
    expect(normalizeGoalTitle("   ")).toBeNull();
  });

  it("sınırı aşan başlığı kırpar", () => {
    const long = "a".repeat(GOAL_TITLE_MAX + 50);
    expect(normalizeGoalTitle(long)).toHaveLength(GOAL_TITLE_MAX);
  });
});

describe("normalizeCategoryName", () => {
  it("kırpar ve sınırı uygular", () => {
    expect(normalizeCategoryName("  Matematik ")).toBe("Matematik");
    expect(normalizeCategoryName("x".repeat(100))).toHaveLength(
      CATEGORY_NAME_MAX,
    );
  });

  it("boş girdide null döner", () => {
    expect(normalizeCategoryName("  ")).toBeNull();
  });
});

describe("parseTargetCount", () => {
  it("boş girdi null döner — hedef görevlerle ölçülür", () => {
    // null GEÇERLİ bir seçimdir, hata değil.
    expect(parseTargetCount("")).toBeNull();
    expect(parseTargetCount("   ")).toBeNull();
  });

  it("geçerli sayıyı çözer", () => {
    expect(parseTargetCount("30")).toBe(30);
    expect(parseTargetCount(" 7 ")).toBe(7);
  });

  it("bozuk girdide undefined döner — null DEĞİL", () => {
    /*
     * Ayrım kritik: undefined "kaydetme, hata göster" demek. null
     * dönseydi "abc" yazan kullanıcının hedefi sessizce görev-bazlı
     * ölçüme düşer ve hiç uyarılmazdı.
     */
    expect(parseTargetCount("abc")).toBeUndefined();
    expect(parseTargetCount("0")).toBeUndefined();
    expect(parseTargetCount("-5")).toBeUndefined();
    expect(parseTargetCount("2.5")).toBeUndefined();
    expect(parseTargetCount("99999")).toBeUndefined();
  });

  it("yarı sayısal girdiyi kabul ETMEZ", () => {
    // parseInt("12abc") 12 dönerdi ve yazım hatasını sessizce yutardı.
    expect(parseTargetCount("12abc")).toBeUndefined();
  });
});

describe("stepDoneCount", () => {
  it("artırır ve azaltır", () => {
    expect(stepDoneCount(3, 1, 10)).toBe(4);
    expect(stepDoneCount(3, -1, 10)).toBe(2);
  });

  it("sıfırın altına inmez", () => {
    expect(stepDoneCount(0, -1, 10)).toBe(0);
  });

  it("hedefin üstüne çıkmaz", () => {
    // "%150 tamamlandı" anlamsız bir ilerleme çubuğu olurdu.
    expect(stepDoneCount(10, 1, 10)).toBe(10);
  });

  it("hedef null ise değeri değiştirmez", () => {
    // Sayaç yalnızca sayısal hedefte kullanılır; hedef yoksa ilerleme
    // görevlerden okunuyor demektir ve elle oynatmanın anlamı yok.
    expect(stepDoneCount(4, 1, null)).toBe(4);
    expect(stepDoneCount(4, -1, null)).toBe(4);
  });
});

describe("isDuplicateCategoryName", () => {
  const list = [
    category({ id: "c1", name: "Matematik" }),
    category({ id: "c2", name: "Spor" }),
  ];

  it("birebir aynı adı yakalar", () => {
    expect(isDuplicateCategoryName(list, "Matematik")).toBe(true);
  });

  it("büyük/küçük harf farkını yakalar", () => {
    expect(isDuplicateCategoryName(list, "matematik")).toBe(true);
    expect(isDuplicateCategoryName(list, "MATEMATİK")).toBe(true);
  });

  it("Türkçe'de noktasız I, noktalı i'den FARKLI sayılır", () => {
    /*
     * Türkçe'de "İ"nin küçüğü "i", "I"nın küçüğü "ı"dır — yani
     * "MATEMATIK" (noktasız I) ile "Matematik" (noktalı i) AYNI kelime
     * değildir. `localeCompare(..., "tr")` bunu doğru ayırır; İngilizce
     * collation ikisini aynı sayar ve kullanıcıya "bu ad zaten var"
     * derdi — oysa Türkçe okuyan biri için farklı iki kelime.
     *
     * Noktalı büyük harf ise çakışır (yukarıdaki test): "MATEMATİK"
     * gerçekten "Matematik"tir.
     */
    expect(isDuplicateCategoryName(list, "MATEMATIK")).toBe(false);
  });

  it("kırpılmış hâliyle karşılaştırır", () => {
    expect(isDuplicateCategoryName(list, "  Spor  ")).toBe(true);
  });

  it("farklı adda false döner", () => {
    expect(isDuplicateCategoryName(list, "Fizik")).toBe(false);
  });

  it("kendi kimliğini dışlar — yeniden adlandırma çakışma değildir", () => {
    // "Matematik"i yine "Matematik" olarak kaydetmek engellenmemeli.
    expect(isDuplicateCategoryName(list, "Matematik", "c1")).toBe(false);
  });

  it("boş girdide false döner", () => {
    // Boşluk kontrolü normalize'ın işi; burada çakışma yok demek doğru.
    expect(isDuplicateCategoryName(list, "   ")).toBe(false);
  });
});
