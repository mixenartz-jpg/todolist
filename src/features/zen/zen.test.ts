import { describe, expect, it } from "vitest";
import { elapsedSeconds, formatElapsed } from "./zen";

describe("formatElapsed", () => {
  it("sıfırı 0:00 yazar", () => {
    expect(formatElapsed(0)).toBe("0:00");
  });

  it("saniyeyi iki hane doldurur", () => {
    expect(formatElapsed(5)).toBe("0:05");
    expect(formatElapsed(65)).toBe("1:05");
  });

  it("dakikayı bir saate kadar sade yazar", () => {
    expect(formatElapsed(59 * 60 + 59)).toBe("59:59");
  });

  /*
   * "0:05:12" ilk bakışta beş saat gibi okunuyor; odak ekranında tek
   * iş sayının anında anlaşılması.
   */
  it("bir saatin altında saat hanesi YAZMAZ", () => {
    expect(formatElapsed(312)).toBe("5:12");
  });

  it("bir saati geçince saat hanesi açılır", () => {
    expect(formatElapsed(3600)).toBe("1:00:00");
    expect(formatElapsed(3661)).toBe("1:01:01");
  });

  it("negatifi sıfır sayar", () => {
    expect(formatElapsed(-10)).toBe("0:00");
  });

  it("kesirli saniyeyi aşağı yuvarlar", () => {
    expect(formatElapsed(9.9)).toBe("0:09");
  });
});

describe("elapsedSeconds", () => {
  it("iki damga arasını saniyeye çevirir", () => {
    expect(elapsedSeconds(1_000_000, 1_005_000)).toBe(5);
  });

  it("bir saniyenin altını sıfır sayar", () => {
    expect(elapsedSeconds(1_000_000, 1_000_900)).toBe(0);
  });

  /*
   * Sistem saati geri alınırsa (yaz saati, NTP düzeltmesi) sayaç
   * geriye sayıp "-3:12" gösterirdi.
   */
  it("saat geri alınırsa sıfırda durur", () => {
    expect(elapsedSeconds(1_005_000, 1_000_000)).toBe(0);
  });
});
