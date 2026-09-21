import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import {
  AYT_TOPLAM_SORU,
  TYT_TOPLAM_SORU,
  aytAlanGerekir,
  derslerIcin,
  toplamSoru,
  varsayilanAd,
} from "./sinav";

/*
 * Sınav yapısı testleri.
 *
 * Buradaki sayılar ÖSYM'nin dağılımıdır ve dokuz yıldır sabittir;
 * yine de testle kilitleniyorlar çünkü bir yazım hatası (40 yerine 4)
 * sessizce yanlış bir net tavanı üretir ve hiçbir yerde patlamaz.
 */

describe("derslerIcin", () => {
  it("TYT dört test getirir ve toplam 120 soru eder", () => {
    const dersler = derslerIcin("tyt", null);

    expect(dersler).toHaveLength(4);
    expect(toplamSoru(dersler)).toBe(TYT_TOPLAM_SORU);
    expect(dersler.map((d) => d.ders)).toEqual([
      "Türkçe",
      "Sosyal Bilimler",
      "Temel Matematik",
      "Fen Bilimleri",
    ]);
  });

  it("TYT sırası SINAV düzenidir, alfabetik değil", () => {
    // Kağıtta Türkçe önce gelir. Alfabetik sıralasaydık "Fen" başa
    // geçer ve ekran sınavla uyuşmazdı.
    const [ilk] = derslerIcin("tyt", null);
    expect(ilk?.ders).toBe("Türkçe");
  });

  it("AYT sayısal alanı Matematik + Fen getirir, 80 soru", () => {
    const dersler = derslerIcin("ayt", "say");

    expect(dersler.map((d) => d.ders)).toEqual(["Matematik", "Fen Bilimleri"]);
    expect(toplamSoru(dersler)).toBe(AYT_TOPLAM_SORU);
  });

  it("AYT eşit ağırlık Matematik + Edebiyat-Sosyal-1 getirir", () => {
    const dersler = derslerIcin("ayt", "ea");

    expect(dersler.map((d) => d.ders)).toEqual([
      "Türk Dili ve Edebiyatı - Sosyal Bilimler-1",
      "Matematik",
    ]);
    expect(toplamSoru(dersler)).toBe(AYT_TOPLAM_SORU);
  });

  it("AYT sözel iki sosyal testini getirir", () => {
    const dersler = derslerIcin("ayt", "soz");

    expect(dersler).toHaveLength(2);
    expect(toplamSoru(dersler)).toBe(AYT_TOPLAM_SORU);
  });

  it("her AYT alanı 80 soru eder — aday 160'ın yarısını cevaplar", () => {
    for (const alan of ["say", "ea", "soz"] as const) {
      expect(toplamSoru(derslerIcin("ayt", alan))).toBe(AYT_TOPLAM_SORU);
    }
  });

  it("DİL alanı tek test, 80 soru", () => {
    const dersler = derslerIcin("ayt", "dil");

    expect(dersler).toHaveLength(1);
    expect(toplamSoru(dersler)).toBe(AYT_TOPLAM_SORU);
  });

  it("YDT tek test getirir", () => {
    const dersler = derslerIcin("ydt", null);

    expect(dersler).toHaveLength(1);
    expect(toplamSoru(dersler)).toBe(AYT_TOPLAM_SORU);
  });

  it("branş denemesi BOŞ liste döner — dersi kullanıcı seçer", () => {
    /*
     * Branşın sabit bir dağılımı YOK: "40 soruluk matematik denemesi"
     * de "20 soruluk paragraf denemesi" de branştır. Varsayılan
     * dayatmak, kullanıcıyı her seferinde silmeye zorlardı.
     */
    expect(derslerIcin("brans", null)).toEqual([]);
  });

  it("AYT alan verilmeden boş döner", () => {
    // Alan olmadan hangi 80 sorunun cevaplandığı bilinemez.
    expect(derslerIcin("ayt", null)).toEqual([]);
  });

  it("dönen liste her çağrıda YENİ dizidir", () => {
    /*
     * Ekran gelen satırları düzenliyor (soru sayısını değiştirmek
     * meşru). Paylaşılan bir sabit dizi dönseydi, bir denemede
     * yapılan düzenleme sonraki denemeye sızardı.
     */
    const a = derslerIcin("tyt", null);
    const b = derslerIcin("tyt", null);

    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    expect(a).toEqual(b);
  });

  it("sort_order sıralamayı korur", () => {
    const dersler = derslerIcin("tyt", null);
    expect(dersler.map((d) => d.sortOrder)).toEqual([0, 1, 2, 3]);
  });
});

describe("aytAlanGerekir", () => {
  it("yalnızca AYT alan ister", () => {
    // Veritabanındaki `deneme_alan_tutarli` kısıtının istemci tarafı.
    expect(aytAlanGerekir("ayt")).toBe(true);
    expect(aytAlanGerekir("tyt")).toBe(false);
    expect(aytAlanGerekir("brans")).toBe(false);
    expect(aytAlanGerekir("ydt")).toBe(false);
  });
});

describe("varsayilanAd", () => {
  it("tür ve tarihten okunabilir bir ad üretir", () => {
    // Ad zorunlu; boş bırakılamıyorsa en azından anlamlı bir
    // başlangıç verilmeli ki kullanıcı her seferinde sıfırdan
    // yazmasın.
    expect(varsayilanAd("tyt", asDateStr("2026-09-21"))).toBe("TYT denemesi · 21 Eylül");
    expect(varsayilanAd("ayt", asDateStr("2026-01-05"))).toBe("AYT denemesi · 5 Ocak");
  });

  it("branş için genel bir ad verir", () => {
    expect(varsayilanAd("brans", asDateStr("2026-09-21"))).toBe("Branş denemesi · 21 Eylül");
  });
});
