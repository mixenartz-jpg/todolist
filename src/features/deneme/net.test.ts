import { describe, expect, it } from "vitest";
import {
  NET_ADIMI,
  dagilimGecerli,
  hesaplaNet,
  kalanBos,
  toplamNet,
  yanlisBosOrani,
} from "./net";

/*
 * Net hesabının testleri.
 *
 * Buradaki her vaka alan kuralının bir maddesini kilitler; "şu an
 * böyle çalışıyor" diye yazılmış tek bir test yok. Özellikle üç
 * madde bilerek sabitlenmiştir: net NEGATİF olabilir, net her zaman
 * 0.25'in katıdır, ve boş cevabın neti hiç etkilememesi.
 */

describe("hesaplaNet", () => {
  it("her yanlış tam olarak 0.25 net götürür", () => {
    expect(hesaplaNet(20, 4)).toBe(19);
    expect(hesaplaNet(20, 0)).toBe(20);
    expect(hesaplaNet(0, 4)).toBe(-1);
  });

  it("boş cevap neti ETKİLEMEZ", () => {
    // Aynı doğru/yanlış ikilisi, farklı boş sayıları: net değişmemeli.
    // Boşu cezalandıran bir hesap, "emin değilsem boş bırak"
    // stratejisini yanlış biçimde cezalandırırdı.
    expect(hesaplaNet(30, 8)).toBe(28);
  });

  it("net NEGATİF olabilir — sıfıra kırpılmaz", () => {
    /*
     * ÖSYM kırpmıyor; biz de kırpmıyoruz. Kırpmak, çok yanlış yapan
     * iki denemeyi ("2 doğru 12 yanlış" ile "0 doğru 4 yanlış")
     * ekranda AYNI gösterir ve kötüye gidişi gizlerdi.
     */
    expect(hesaplaNet(2, 12)).toBe(-1);
    expect(hesaplaNet(0, 40)).toBe(-10);
  });

  it("sonuç her zaman 0.25'in katıdır", () => {
    for (let dogru = 0; dogru <= 40; dogru++) {
      for (let yanlis = 0; yanlis <= 40 - dogru; yanlis++) {
        const net = hesaplaNet(dogru, yanlis);
        // Kayan nokta artığı bırakmamalı: 1/4 ikilik tabanda tam
        // temsil edilir, ama yine de değişmezi açıkça kilitliyoruz.
        expect(Number.isInteger(net / NET_ADIMI)).toBe(true);
      }
    }
  });

  it("kayan nokta artığı üretmez", () => {
    // 0.1 + 0.2 tuzağının bu hesapta karşılığı olmadığını sabitler.
    expect(hesaplaNet(13, 7)).toBe(11.25);
    expect(hesaplaNet(1, 1)).toBe(0.75);
  });
});

describe("toplamNet", () => {
  it("ders netlerini toplar", () => {
    const net = toplamNet([
      { dogru: 32, yanlis: 5 },
      { dogru: 28, yanlis: 8 },
    ]);
    // 30.75 + 26 = 56.75
    expect(net).toBe(56.75);
  });

  it("boş listede 0 döner", () => {
    // null DEĞİL 0: "hiç ders girilmemiş deneme" diye bir şey yok,
    // ders satırı olmayan bir deneme henüz doldurulmamış demektir ve
    // ekran onu 0 net olarak değil "eksik" olarak ayrı ele alır.
    expect(toplamNet([])).toBe(0);
  });

  it("toplam da 0.25'in katı kalır", () => {
    const net = toplamNet([
      { dogru: 1, yanlis: 1 },
      { dogru: 1, yanlis: 1 },
      { dogru: 1, yanlis: 1 },
    ]);
    expect(net).toBe(2.25);
    expect(Number.isInteger(net / NET_ADIMI)).toBe(true);
  });

  it("negatif ders neti toplamı aşağı çeker", () => {
    expect(toplamNet([{ dogru: 10, yanlis: 0 }, { dogru: 0, yanlis: 8 }])).toBe(8);
  });
});

describe("dagilimGecerli", () => {
  it("üçlü toplamı soru sayısını vermeli", () => {
    expect(dagilimGecerli({ dogru: 30, yanlis: 5, bos: 5, soruSayisi: 40 })).toBe(true);
    expect(dagilimGecerli({ dogru: 30, yanlis: 5, bos: 4, soruSayisi: 40 })).toBe(false);
    expect(dagilimGecerli({ dogru: 30, yanlis: 5, bos: 6, soruSayisi: 40 })).toBe(false);
  });

  it("negatif değer geçersizdir", () => {
    expect(dagilimGecerli({ dogru: -1, yanlis: 0, bos: 41, soruSayisi: 40 })).toBe(false);
  });

  it("tam sayı olmayan değer geçersizdir", () => {
    // Girdi alanından "3.5" gelebilir; kısıt veritabanına varmadan
    // burada tutulmalı.
    expect(dagilimGecerli({ dogru: 3.5, yanlis: 0, bos: 36.5, soruSayisi: 40 })).toBe(false);
  });
});

describe("kalanBos", () => {
  it("üçüncü alanı türetir", () => {
    // Girişin hızlı olmasının dayanağı: kullanıcı doğru ve yanlışı
    // yazar, boş kendiliğinden dolar.
    expect(kalanBos(30, 5, 40)).toBe(5);
    expect(kalanBos(40, 0, 40)).toBe(0);
  });

  it("toplam soru sayısını aşarsa null döner", () => {
    // 0 DEĞİL null: sıfır geçerli bir boş sayısıdır ve hatayı
    // "hepsini cevapladı" gibi gösterirdi.
    expect(kalanBos(30, 15, 40)).toBeNull();
  });

  it("negatif girdide null döner", () => {
    expect(kalanBos(-1, 0, 40)).toBeNull();
  });
});

describe("yanlisBosOrani", () => {
  /*
   * Alan araştırmasının en güçlü teşhis metriği ve tüketici
   * uygulamalarında neredeyse hiç yok: yanlış / (yanlış + boş).
   * Yüksek → tahmin ediyorsun (boş bırakmalıydın).
   * Düşük  → fazla çekingensin (cevaplamalıydın).
   */
  it("yanlışın, cevaplanmayan+yanlış içindeki payını verir", () => {
    expect(yanlisBosOrani(10, 10)).toBe(0.5);
    expect(yanlisBosOrani(9, 1)).toBe(0.9);
    expect(yanlisBosOrani(1, 9)).toBe(0.1);
  });

  it("hem yanlış hem boş sıfırsa null döner", () => {
    /*
     * 0 DEĞİL null — bu ayrım kritik. Sıfır dönseydi hatasız bir
     * deneme "çok çekingen" ucunda görünürdü; oysa ölçülecek bir
     * davranış YOK. `goalProgress`'in `ratio: null` kararıyla aynı
     * aile: ölçü yoksa sayı uydurulmaz.
     */
    expect(yanlisBosOrani(0, 0)).toBeNull();
  });

  it("tamamı yanlışsa 1, tamamı boşsa 0", () => {
    expect(yanlisBosOrani(12, 0)).toBe(1);
    expect(yanlisBosOrani(0, 12)).toBe(0);
  });
});
