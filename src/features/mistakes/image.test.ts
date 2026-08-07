import { describe, expect, test } from "vitest";
import {
  fitDimensions,
  imagePath,
  MAX_EDGE,
  MAX_INPUT_BYTES,
  pickImageItem,
  validateImageInput,
} from "./image";

describe("fitDimensions", () => {
  test("sınırın altındaki görseli BÜYÜTMEZ", () => {
    expect(fitDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  test("tam sınırdaki görsele dokunmaz", () => {
    expect(fitDimensions(1600, 900, 1600)).toEqual({ width: 1600, height: 900 });
  });

  test("yatay görselde genişliği kırpar", () => {
    expect(fitDimensions(3200, 1800, 1600)).toEqual({ width: 1600, height: 900 });
  });

  test("dikey görselde yüksekliği kırpar", () => {
    expect(fitDimensions(1800, 3200, 1600)).toEqual({ width: 900, height: 1600 });
  });

  test("en-boy oranını korur", () => {
    const { width, height } = fitDimensions(2560, 1440, 1600);
    expect(Math.abs(width / height - 2560 / 1440)).toBeLessThan(0.01);
  });

  test("tam sayı döner", () => {
    const { width, height } = fitDimensions(1919, 1079, 1600);
    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
  });

  test("aşırı ince görselde kenar en az 1 kalır", () => {
    const { height } = fitDimensions(10000, 3, 1600);
    expect(height).toBeGreaterThanOrEqual(1);
  });

  test("varsayılan sınır MAX_EDGE'dir", () => {
    expect(fitDimensions(MAX_EDGE * 2, MAX_EDGE * 2)).toEqual({
      width: MAX_EDGE,
      height: MAX_EDGE,
    });
  });
});

describe("imagePath", () => {
  test("kullanıcı kimliğiyle öneklenir", () => {
    expect(imagePath("user-1", "abc")).toBe("user-1/abc.webp");
  });
});

describe("pickImageItem", () => {
  test("string öğelerini atlar, ilk görsel dosyayı seçer", () => {
    // Gerçek durum: Snipping Tool yapıştırması hem text/html string
    // hem image/png file öğesi üretir.
    const items = [
      { kind: "string", type: "text/html" },
      { kind: "string", type: "text/plain" },
      { kind: "file", type: "image/png" },
    ];

    expect(pickImageItem(items)).toEqual({ kind: "file", type: "image/png" });
  });

  test("görsel olmayan dosyayı seçmez", () => {
    expect(pickImageItem([{ kind: "file", type: "application/pdf" }])).toBeNull();
  });

  test("görsel tipli string öğesini seçmez", () => {
    expect(pickImageItem([{ kind: "string", type: "image/png" }])).toBeNull();
  });

  test("boş panoda null döner", () => {
    expect(pickImageItem([])).toBeNull();
  });
});

describe("validateImageInput", () => {
  test("desteklenen tipleri kabul eder", () => {
    expect(validateImageInput("image/png", 1000)).toBeNull();
    expect(validateImageInput("image/jpeg", 1000)).toBeNull();
    expect(validateImageInput("image/webp", 1000)).toBeNull();
  });

  test("görsel olmayanı reddeder", () => {
    expect(validateImageInput("application/pdf", 1000)).toContain("görsel");
  });

  test("desteklenmeyen görsel tipini reddeder", () => {
    expect(validateImageInput("image/gif", 1000)).toContain("PNG");
  });

  test("çok büyük dosyayı reddeder", () => {
    expect(validateImageInput("image/png", MAX_INPUT_BYTES + 1)).toContain("büyük");
  });

  test("tam sınırdaki dosyayı kabul eder", () => {
    expect(validateImageInput("image/png", MAX_INPUT_BYTES)).toBeNull();
  });
});
