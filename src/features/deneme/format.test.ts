import { describe, expect, it } from "vitest";
import {
  formatNet,
  formatNetDegisim,
  formatOran,
  formatSure,
  parseSayi,
} from "./format";

describe("formatNet", () => {
  it("her zaman iki ondalık gösterir — sıfırlar atılmaz", () => {
    /*
     * Sütun hizası: "86" ile "85,75" alt alta geldiğinde göz
     * karşılaştıramaz. Ondalık sayısı sabit olmalı.
     */
    expect(formatNet(86)).toBe("86,00");
    expect(formatNet(85.75)).toBe("85,75");
    expect(formatNet(0)).toBe("0,00");
  });

  it("ondalık ayırıcı VİRGÜL", () => {
    expect(formatNet(30.25)).toBe("30,25");
    expect(formatNet(30.25)).not.toContain(".");
  });

  it("negatif neti olduğu gibi gösterir", () => {
    // Kırpma net.ts'te reddedildi; biçimlendirme de kırpmamalı.
    expect(formatNet(-1)).toBe("-1,00");
  });
});

describe("formatNetDegisim", () => {
  it("artışa AÇIK artı işareti koyar", () => {
    // "3,25" tek başına bir değişim değil, bir değer gibi okunur.
    expect(formatNetDegisim(3.25)).toBe("+3,25");
  });

  it("düşüşte tipografik eksi kullanır — ASCII tire DEĞİL", () => {
    const metin = formatNetDegisim(-1.5);
    expect(metin).toBe("−1,50");
    expect(metin.startsWith("-")).toBe(false);
  });

  it("sıfır değişimde işaret koymaz", () => {
    // "+0,00" ilerleme varmış gibi durur.
    expect(formatNetDegisim(0)).toBe("0,00");
  });
});

describe("formatSure", () => {
  it("bir saatin altında dakika gösterir", () => {
    expect(formatSure(45)).toBe("45 dk");
  });

  it("tam saati dakikasız yazar", () => {
    expect(formatSure(120)).toBe("2 sa");
  });

  it("saat ve dakikayı birleştirir", () => {
    expect(formatSure(135)).toBe("2 sa 15 dk");
  });
});

describe("formatOran", () => {
  it("ondalıksız yuvarlar — sahte kesinlik yok", () => {
    expect(formatOran(0.234)).toBe("%23");
    expect(formatOran(0.24)).toBe("%24");
    expect(formatOran(1)).toBe("%100");
  });
});

describe("parseSayi", () => {
  it("boş alan null — bu MEŞRU bir durum", () => {
    expect(parseSayi("", 40)).toBeNull();
    expect(parseSayi("   ", 40)).toBeNull();
  });

  it("bozuk girdi undefined — null DEĞİL", () => {
    /*
     * İki durum ayrılmazsa form "abc" yazılmış alanı sessizce boş
     * sayar ve kullanıcı neden kaydedemediğini anlamaz.
     */
    expect(parseSayi("abc", 40)).toBeUndefined();
    expect(parseSayi("12.5", 40)).toBeUndefined();
    expect(parseSayi("-3", 40)).toBeUndefined();
  });

  it("üst sınırı aşan değer bozuk sayılır", () => {
    expect(parseSayi("41", 40)).toBeUndefined();
    expect(parseSayi("40", 40)).toBe(40);
  });

  it("sıfır geçerlidir", () => {
    // "0 doğru" gerçek bir sonuç; boşla karıştırılmamalı.
    expect(parseSayi("0", 40)).toBe(0);
  });
});
