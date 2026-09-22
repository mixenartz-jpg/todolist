import { describe, expect, it } from "vitest";
import {
  baslangicSatirlari,
  bosSatir,
  cozumleSatir,
  kaydedilecekDersler,
  satirlarGecerli,
  type DersSatiri,
} from "./satir";

/*
 * Form satırı mantığının testleri.
 *
 * Asıl korunan ayrım: BOŞ ile BOZUK farklı şeyler. Şablonun getirdiği
 * ama o gün çözülmemiş bir ders satırı formu kilitlememeli; gerçekten
 * hatalı bir satır ise kilitlemeli. İkisi karışırsa kullanıcı ya
 * kaydedemez ya da yanlış veri kaydeder.
 */

function satir(patch: Partial<DersSatiri> = {}): DersSatiri {
  return {
    id: "test-satir",
    ders: "Türkçe",
    dogru: "",
    yanlis: "",
    soruSayisi: "40",
    sortOrder: 0,
    ...patch,
  };
}

describe("cozumleSatir", () => {
  it("şablondan gelen ama doldurulmamış satır BOŞ — bozuk değil", () => {
    /*
     * TYT şablonu dört ders getirir; o gün Fen çözülmediyse o satır
     * boş kalır. Bozuk sayılsaydı form kilitlenir ve ekranda
     * gösterilecek bir hata alanı olmadığı için kullanıcı sebebini
     * göremezdi.
     */
    const cozum = cozumleSatir(satir({ ders: "Fen Bilimleri" }));

    expect(cozum.durum).toBe("bos");
    expect(cozum.deger).toBeNull();
  });

  it("boş sayısını TÜRETİR — girişin hızlı olmasının dayanağı", () => {
    const cozum = cozumleSatir(satir({ dogru: "32", yanlis: "5" }));

    expect(cozum.durum).toBe("dolu");
    expect(cozum.bos).toBe(3); // 40 − 32 − 5
    expect(cozum.deger?.bos).toBe(3);
  });

  it("eksik kalan tek alanı 0 sayar", () => {
    /*
     * "8 yanlış" yazıp doğruyu boş bırakan kullanıcının kastettiği
     * 0 doğrudur. "Girilmemiş" saymak, gerçekten 0 doğru yapmış bir
     * kullanıcıyı satırını kaydedemez duruma düşürürdü.
     */
    const cozum = cozumleSatir(satir({ yanlis: "8" }));

    expect(cozum.durum).toBe("dolu");
    expect(cozum.deger?.dogru).toBe(0);
    expect(cozum.deger?.yanlis).toBe(8);
    expect(cozum.bos).toBe(32);
  });

  it("taşmayı BOZUK sayar — veritabanına varmadan yakalar", () => {
    // 30 + 15 = 45 > 40. Veritabanı da reddederdi (0018 check) ama
    // sunucu hatası hangi satırın bozuk olduğunu söylemez.
    const cozum = cozumleSatir(satir({ dogru: "30", yanlis: "15" }));

    expect(cozum.durum).toBe("bozuk");
    expect(cozum.bos).toBeNull();
  });

  it("sayı girilmiş ama ders adı boşsa BOZUK", () => {
    const cozum = cozumleSatir(satir({ ders: "  ", dogru: "20" }));
    expect(cozum.durum).toBe("bozuk");
  });

  it("sayı girilmiş ama soru sayısı yoksa BOZUK", () => {
    // Boş türetilemez → 0018'in `dogru + yanlis + bos = soru_sayisi`
    // kısıtı sağlanamaz.
    const cozum = cozumleSatir(satir({ dogru: "20", soruSayisi: "" }));
    expect(cozum.durum).toBe("bozuk");
  });

  it("rakam olmayan girdi BOZUK", () => {
    expect(cozumleSatir(satir({ dogru: "abc" })).durum).toBe("bozuk");
    expect(cozumleSatir(satir({ dogru: "12.5" })).durum).toBe("bozuk");
  });

  it("tam dolu satır (boş = 0) geçerlidir", () => {
    const cozum = cozumleSatir(satir({ dogru: "35", yanlis: "5" }));

    expect(cozum.durum).toBe("dolu");
    expect(cozum.bos).toBe(0);
  });

  it("sıfır doğru sıfır yanlış — hepsi boş bırakılmış ders", () => {
    // "0" girmek dokunulmamışlıktan farklıdır: kullanıcı o dersi
    // açıkça "hiç yapamadım" diye işaretlemiş olabilir.
    const cozum = cozumleSatir(satir({ dogru: "0", yanlis: "0" }));

    expect(cozum.durum).toBe("dolu");
    expect(cozum.bos).toBe(40);
  });
});

describe("baslangicSatirlari", () => {
  it("TYT dört dersi soru sayılarıyla getirir", () => {
    const satirlar = baslangicSatirlari("tyt", null);

    expect(satirlar).toHaveLength(4);
    expect(satirlar[0].ders).toBe("Türkçe");
    expect(satirlar[0].soruSayisi).toBe("40");
    // Sayılar BOŞ gelir — şablon dersi önerir, sonucu uydurmaz.
    expect(satirlar.every((s) => s.dogru === "" && s.yanlis === "")).toBe(true);
  });

  it("branşta tek boş satır açar — dayatma yok, boşluk da yok", () => {
    const satirlar = baslangicSatirlari("brans", null);

    expect(satirlar).toHaveLength(1);
    expect(satirlar[0].ders).toBe("");
  });

  it("alansız AYT'de de tek boş satır açar", () => {
    // Alan seçilmeden hangi 80 sorunun cevaplandığı bilinemez.
    expect(baslangicSatirlari("ayt", null)).toHaveLength(1);
  });

  it("her satıra BENZERSİZ kimlik verir", () => {
    /*
     * Kimlik React anahtarı olarak kullanılıyor. Çakışsaydı ortadan
     * bir satır silindiğinde imleç ve hata kenarlığı yanlış satıra
     * sıçrardı — gerekçe `DersSatiri.id` üzerinde yazılı.
     */
    const satirlar = [
      ...baslangicSatirlari("tyt", null),
      bosSatir(4),
      bosSatir(5),
    ];
    const kimlikler = satirlar.map((s) => s.id);

    expect(new Set(kimlikler).size).toBe(satirlar.length);
  });

  it("AYT-SAY iki dersi getirir", () => {
    const satirlar = baslangicSatirlari("ayt", "say");

    expect(satirlar.map((s) => s.ders)).toEqual(["Matematik", "Fen Bilimleri"]);
  });
});

describe("satirlarGecerli", () => {
  const dolu = cozumleSatir(satir({ dogru: "30", yanlis: "4" }));
  const bos = cozumleSatir(satir());
  const bozuk = cozumleSatir(satir({ dogru: "abc" }));

  it("boş satırlar kaydetmeyi ENGELLEMEZ", () => {
    expect(satirlarGecerli([dolu, bos, bos, bos])).toBe(true);
  });

  it("tek bozuk satır kaydetmeyi engeller", () => {
    expect(satirlarGecerli([dolu, bozuk])).toBe(false);
  });

  it("hiç dolu satır yoksa kaydedilemez", () => {
    /*
     * Dersleri olmayan bir deneme listede "0,00 net" diye görünür ve
     * kullanıcının silmek zorunda kalacağı bir kayıt olurdu.
     */
    expect(satirlarGecerli([bos, bos])).toBe(false);
    expect(satirlarGecerli([])).toBe(false);
  });
});

describe("kaydedilecekDersler", () => {
  it("boş satırları atlar ve sıra numaralarını YENİDEN verir", () => {
    const cozumler = [
      cozumleSatir(satir({ ders: "Türkçe", dogru: "32", yanlis: "5", sortOrder: 0 })),
      cozumleSatir(satir({ ders: "Sosyal", sortOrder: 1 })), // boş
      cozumleSatir(satir({ ders: "Matematik", dogru: "28", yanlis: "8", sortOrder: 2 })),
    ];

    const dersler = kaydedilecekDersler(cozumler);

    expect(dersler.map((d) => d.ders)).toEqual(["Türkçe", "Matematik"]);
    // Delikli sıra (0, 2) değil kesintisiz (0, 1): sonradan satır
    // eklendiğinde sıralamanın nereye düşeceği tahmin edilebilir kalır.
    expect(dersler.map((d) => d.sortOrder)).toEqual([0, 1]);
  });

  it("ders adını kırpar", () => {
    const cozumler = [
      cozumleSatir(satir({ ders: "  Türkçe  ", dogru: "30", yanlis: "0" })),
    ];

    expect(kaydedilecekDersler(cozumler)[0].ders).toBe("Türkçe");
  });
});
