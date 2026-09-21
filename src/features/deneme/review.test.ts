import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import {
  MEZUN_ASAMA,
  type TekrarDurumu,
  type TekrarTasiyan,
  ilkTekrarDurumu,
  mezunMu,
  tekrariIlerlet,
  vadesiGelenler,
  vadesiGeldiMi,
} from "./review";

/*
 * Tekrar merdiveni testleri — silinen `mistakes/review.test.ts`'ten
 * uyarlandı. En kritik iki vaka aynen korundu: vadenin TEKRARIN
 * yapıldığı günden hesaplanması ve mezun durumun idempotentliği.
 */

const d = asDateStr;

/** Test için kısa satır kurucusu. */
function satir(
  id: string,
  asama: number,
  vade: string | null,
): TekrarTasiyan {
  return {
    id,
    reviewStage: asama,
    nextReviewDate: vade === null ? null : d(vade),
  };
}

describe("ilkTekrarDurumu", () => {
  it("ilk vade ertesi gündür", () => {
    expect(ilkTekrarDurumu(d("2026-08-01"))).toEqual({
      asama: 0,
      sonrakiTekrar: "2026-08-02",
    });
  });

  it("ay sınırını doğru geçer", () => {
    expect(ilkTekrarDurumu(d("2026-08-31")).sonrakiTekrar).toBe("2026-09-01");
  });
});

describe("tekrariIlerlet", () => {
  it("merdiven 1 → 3 → 7 → 21 gün üretir, sonra mezun eder", () => {
    let durum = ilkTekrarDurumu(d("2026-08-01"));
    expect(durum.sonrakiTekrar).toBe("2026-08-02");

    durum = tekrariIlerlet(durum, d("2026-08-02"));
    expect(durum).toEqual({ asama: 1, sonrakiTekrar: "2026-08-05" }); // +3

    durum = tekrariIlerlet(durum, d("2026-08-05"));
    expect(durum).toEqual({ asama: 2, sonrakiTekrar: "2026-08-12" }); // +7

    durum = tekrariIlerlet(durum, d("2026-08-12"));
    expect(durum).toEqual({ asama: 3, sonrakiTekrar: "2026-09-02" }); // +21

    durum = tekrariIlerlet(durum, d("2026-09-02"));
    expect(durum).toEqual({ asama: MEZUN_ASAMA, sonrakiTekrar: null });
  });

  it("vade TEKRARIN yapıldığı günden hesaplanır, orijinal tarihten değil", () => {
    /*
     * Asıl tuzak: 1'inde kaydedip 20'sine kadar uygulamayı açmayan
     * biri, birikmiş tekrarı 20'sinde yaptığında sonraki vade 23'ü
     * olmalı — 4'ü değil. Orijinal tarihten hesaplasaydık, uzun bir
     * aradan dönen kullanıcının kuyruğu ne kadar çalışırsa çalışsın
     * boşalmazdı.
     */
    const durum = ilkTekrarDurumu(d("2026-08-01")); // vade 08-02
    const sonraki = tekrariIlerlet(durum, d("2026-08-20"));

    expect(sonraki.sonrakiTekrar).toBe("2026-08-23"); // 20 + 3
  });

  it("mezun durumdan ilerletmek IDEMPOTENT", () => {
    // Çift tıklama ya da tekrar gönderim 0'a sarmamalı.
    const mezun: TekrarDurumu = { asama: MEZUN_ASAMA, sonrakiTekrar: null };
    expect(tekrariIlerlet(mezun, d("2026-09-10"))).toEqual(mezun);
  });

  it("girdi nesnesini DEĞİŞTİRMEZ", () => {
    const durum = ilkTekrarDurumu(d("2026-08-01"));
    const kopya = { ...durum };
    tekrariIlerlet(durum, d("2026-08-02"));
    expect(durum).toEqual(kopya);
  });
});

describe("vadesiGeldiMi", () => {
  it("bugün vadesi olan gelmiştir", () => {
    expect(vadesiGeldiMi({ asama: 0, sonrakiTekrar: d("2026-08-10") }, d("2026-08-10"))).toBe(true);
  });

  it("GEÇMİŞ vadeler de gelmiştir — kaçırılan tekrar kaybolmaz", () => {
    expect(vadesiGeldiMi({ asama: 1, sonrakiTekrar: d("2026-08-01") }, d("2026-08-20"))).toBe(true);
  });

  it("gelecek vade henüz gelmemiştir", () => {
    expect(vadesiGeldiMi({ asama: 0, sonrakiTekrar: d("2026-08-20") }, d("2026-08-10"))).toBe(false);
  });

  it("mezun olan bir daha vadesi gelmez", () => {
    expect(vadesiGeldiMi({ asama: MEZUN_ASAMA, sonrakiTekrar: null }, d("2030-01-01"))).toBe(false);
  });
});

describe("mezunMu", () => {
  it("vade null ise mezundur", () => {
    expect(mezunMu({ asama: MEZUN_ASAMA, sonrakiTekrar: null })).toBe(true);
    expect(mezunMu({ asama: 2, sonrakiTekrar: d("2026-08-10") })).toBe(false);
  });
});

describe("vadesiGelenler", () => {
  it("en eski vade önce gelir", () => {
    const kayitlar = [
      satir("b", 1, "2026-08-10"),
      satir("a", 0, "2026-08-05"),
      satir("c", 2, "2026-08-08"),
    ];

    expect(vadesiGelenler(kayitlar, d("2026-08-15")).map((k) => k.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("aynı vadede sıra KARARLI — id ile bozulur", () => {
    // Aksi hâlde aynı güne düşen iki yanlış her render'da yer
    // değiştirir ve liste titrer.
    const kayitlar = [
      satir("z", 0, "2026-08-05"),
      satir("a", 0, "2026-08-05"),
    ];

    expect(vadesiGelenler(kayitlar, d("2026-08-15")).map((k) => k.id)).toEqual(["a", "z"]);
  });

  it("vadesi gelmeyenleri ve mezunları eler", () => {
    const kayitlar = [
      satir("gelecek", 0, "2026-09-01"),
      satir("mezun", MEZUN_ASAMA, null),
      satir("vadesi", 1, "2026-08-01"),
    ];

    expect(vadesiGelenler(kayitlar, d("2026-08-15")).map((k) => k.id)).toEqual(["vadesi"]);
  });

  it("girdi dizisini DEĞİŞTİRMEZ", () => {
    const kayitlar = [
      satir("b", 0, "2026-08-10"),
      satir("a", 0, "2026-08-05"),
    ];
    const once = kayitlar.map((k) => k.id);

    vadesiGelenler(kayitlar, d("2026-08-15"));

    expect(kayitlar.map((k) => k.id)).toEqual(once);
  });

  it("boş listede boş döner", () => {
    expect(vadesiGelenler([], d("2026-08-15"))).toEqual([]);
  });
});
