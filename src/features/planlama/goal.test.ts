import { describe, expect, it } from "vitest";
import { category } from "@/features/testing/fixtures";
import {
  CATEGORY_NAME_MAX,
  GOAL_TITLE_MAX,
  completionStamp,
  isDuplicateCategoryName,
  normalizeCategoryName,
  normalizeGoalTitle,
  parseTargetCount,
  recountOnTargetChange,
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

describe("completionStamp", () => {
  const NOW = "2026-08-17T10:00:00.000Z";

  it("sayaç hedefe ulaşınca damgalar", () => {
    expect(completionStamp(3, 3, NOW)).toBe(NOW);
  });

  it("sayaç hedefin altındayken null döner", () => {
    expect(completionStamp(2, 3, NOW)).toBeNull();
  });

  it("hedefin üstünde de damgalı kalır", () => {
    // Sayaç normalde kırpılır ama veri eski bir kayıttan gelmiş
    // olabilir; ">=" karşılaştırması onu da tamamlanmış sayar.
    expect(completionStamp(5, 3, NOW)).toBe(NOW);
  });

  it("sayaçsız hedefte HER ZAMAN null döner", () => {
    // Orada tamamlanma yalnızca elle işaretlenir; bu fonksiyonun
    // kararı değildir.
    expect(completionStamp(0, null, NOW)).toBeNull();
    expect(completionStamp(9, null, NOW)).toBeNull();
  });
});

describe("recountOnTargetChange", () => {
  const NOW = "2026-08-17T10:00:00.000Z";
  const EARLIER = "2026-08-16T08:00:00.000Z";

  it("hedef DEĞİŞMEDİYSE elle konan işareti KORUR", () => {
    /*
     * Regresyon (en sinsi olanı): kullanıcı 3/5'te kutucuğu elle
     * işaretliyor, sonra yalnızca başlıktaki yazım hatasını düzeltip
     * kaydediyor. Form her kaydetmede mevcut hedefi olduğu gibi geri
     * gönderdiği için buraya `target` DEĞİŞMEMİŞ olarak gelir.
     *
     * Erken çıkış olmasaydı tamamlanma sayaçtan yeniden hesaplanır
     * (3 < 5 → null) ve kullanıcı sadece başlığa dokunduğu için işaret
     * sessizce silinirdi.
     */
    expect(
      recountOnTargetChange(
        { doneCount: 3, completedAt: EARLIER, targetCount: 5 },
        5,
        NOW,
      ),
    ).toEqual({ doneCount: 3, completedAt: EARLIER });
  });

  it("sayaçsız hedefte de değişmemiş hedefe dokunmaz", () => {
    expect(
      recountOnTargetChange(
        { doneCount: 0, completedAt: EARLIER, targetCount: null },
        null,
        NOW,
      ),
    ).toEqual({ doneCount: 0, completedAt: EARLIER });
  });

  it("hedef düşünce sayacı kırpar ve hedefi TAMAMLANMIŞ sayar", () => {
    /*
     * 2/5'teyken hedef 2'ye çekilirse sayaç artık hedefe eşittir.
     * Yeniden hesaplanmasaydı kart tamamlanmamış görünür ve `+` düğmesi
     * de sınırda devre dışı olduğu için kullanıcı o hedefi sayaçla
     * ASLA tamamlayamazdı.
     */
    expect(
      recountOnTargetChange(
        { doneCount: 2, completedAt: null, targetCount: 5 },
        2,
        NOW,
      ),
    ).toEqual({ doneCount: 2, completedAt: NOW });
  });

  it("sayacı yeni hedefin üstünde bırakmaz", () => {
    // "7 / 3" gibi bir sayaç anlamsız olurdu.
    expect(
      recountOnTargetChange(
        { doneCount: 7, completedAt: null, targetCount: 10 },
        3,
        NOW,
      ),
    ).toEqual({ doneCount: 3, completedAt: NOW });
  });

  it("hedef yükselince tamamlanmayı geri alır", () => {
    // 3/3 tamamlanmış hedefin sınırı 5'e çıkarsa iş bitmemiştir.
    expect(
      recountOnTargetChange(
        { doneCount: 3, completedAt: EARLIER, targetCount: 3 },
        5,
        NOW,
      ),
    ).toEqual({ doneCount: 3, completedAt: null });
  });

  it("hedef kaldırılınca sayacı sıfırlar ama tamamlanmaya DOKUNMAZ", () => {
    /*
     * Sayaç sıfırlanır: hedef tekrar sayısal yapıldığında kullanıcının
     * hiç işaretlemediği eski bir ilerleme canlanmasın diye.
     *
     * `completedAt` KORUNUR: sayaçsız hedefte tamamlanma elle
     * işaretlenir ve onu silmek kullanıcının kararını geri almak olurdu.
     */
    expect(
      recountOnTargetChange(
        { doneCount: 4, completedAt: EARLIER, targetCount: 9 },
        null,
        NOW,
      ),
    ).toEqual({ doneCount: 0, completedAt: EARLIER });
  });

  it("hedef kaldırılınca tamamlanmamış hedef tamamlanmamış kalır", () => {
    expect(
      recountOnTargetChange(
        { doneCount: 4, completedAt: null, targetCount: 9 },
        null,
        NOW,
      ),
    ).toEqual({ doneCount: 0, completedAt: null });
  });

  it("sayaçsız hedefe sayı EKLENİNCE sayaç sıfırdan başlar", () => {
    expect(
      recountOnTargetChange(
        { doneCount: 0, completedAt: null, targetCount: null },
        3,
        NOW,
      ),
    ).toEqual({ doneCount: 0, completedAt: null });
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
