import { describe, expect, it } from "vitest";
import {
  dayLoad,
  formatEstimate,
  parseEstimateInput,
  splitEstimateFromTitle,
  totalEstimate,
} from "./estimate";

describe("formatEstimate", () => {
  it("bir saatin altı dakikadır", () => {
    expect(formatEstimate(15)).toBe("15 dak");
    expect(formatEstimate(45)).toBe("45 dak");
  });

  it("tam saatler ve yarımlar kısa yazılır", () => {
    expect(formatEstimate(60)).toBe("1 saat");
    expect(formatEstimate(240)).toBe("4 saat");
    expect(formatEstimate(90)).toBe("1,5 saat");
  });

  it("diğerleri saat + dakika", () => {
    expect(formatEstimate(100)).toBe("1 sa 40 dak");
  });
});

describe("parseEstimateInput", () => {
  it("düz sayı dakikadır", () => {
    expect(parseEstimateInput("40")).toBe(40);
    expect(parseEstimateInput("40 dk")).toBe(40);
  });

  it("saat birimi ve ondalık", () => {
    expect(parseEstimateInput("2 saat")).toBe(120);
    expect(parseEstimateInput("1,5 saat")).toBe(90);
    expect(parseEstimateInput("2s")).toBe(120);
  });

  it("saat + dakika", () => {
    expect(parseEstimateInput("1 sa 20 dak")).toBe(80);
  });

  it("geçersiz ve sınır dışı girdi null", () => {
    expect(parseEstimateInput("")).toBeNull();
    expect(parseEstimateInput("çorba")).toBeNull();
    expect(parseEstimateInput("0")).toBeNull();
    expect(parseEstimateInput("25 saat")).toBeNull();
  });
});

describe("totalEstimate", () => {
  it("tahmini olmayanları atlar", () => {
    expect(
      totalEstimate([
        { estimateMinutes: 30 },
        { estimateMinutes: null },
        { estimateMinutes: 90 },
      ]),
    ).toBe(120);
  });

  it("hiç tahmin yoksa null", () => {
    expect(totalEstimate([{ estimateMinutes: null }])).toBeNull();
    expect(totalEstimate([])).toBeNull();
  });
});

describe("dayLoad", () => {
  it("planlananı ve bitirileni ayrı toplar", () => {
    expect(
      dayLoad([
        { estimateMinutes: 30, done: true },
        { estimateMinutes: 120, done: false },
        { estimateMinutes: 60, done: true },
        { estimateMinutes: null, done: true },
      ]),
    ).toEqual({ planned: 210, done: 90 });
  });

  it("hiçbiri bitmediyse yapılan 0", () => {
    expect(dayLoad([{ estimateMinutes: 45, done: false }])).toEqual({
      planned: 45,
      done: 0,
    });
  });

  it("tahmin yoksa null", () => {
    expect(dayLoad([{ estimateMinutes: null, done: true }])).toBeNull();
  });
});

describe("splitEstimateFromTitle", () => {
  it("sondaki dakikayı ayırır", () => {
    expect(splitEstimateFromTitle("Paragraf rutini 30dk")).toEqual({
      title: "Paragraf rutini",
      estimateMinutes: 30,
    });
    expect(splitEstimateFromTitle("Tekrar 45 dakika")).toEqual({
      title: "Tekrar",
      estimateMinutes: 45,
    });
  });

  it("saat, ondalık saat ve saat + dakika", () => {
    expect(splitEstimateFromTitle("TYT denemesi 2 saat").estimateMinutes).toBe(120);
    expect(splitEstimateFromTitle("Fizik 1,5 saat").estimateMinutes).toBe(90);
    expect(splitEstimateFromTitle("Fizik 1.5sa").estimateMinutes).toBe(90);
    expect(splitEstimateFromTitle("Geometri 1 sa 20 dk")).toEqual({
      title: "Geometri",
      estimateMinutes: 80,
    });
  });

  it("birimsiz sayı, ortadaki süre ve parantez adın parçası kalır", () => {
    for (const title of [
      "Paragraf | 30 Soru",
      "TYT Deneme 2",
      "Frekans | 2 Fen Denemesi + Analiz (30 Soru ~ 40dk)",
      "40 dk koşu ve esneme",
    ]) {
      expect(splitEstimateFromTitle(title)).toEqual({ title, estimateMinutes: null });
    }
  });

  it("ad boş kalacaksa ya da sınır dışıysa ayırmaz", () => {
    expect(splitEstimateFromTitle("30dk").estimateMinutes).toBeNull();
    expect(splitEstimateFromTitle("Kamp 30 saat").estimateMinutes).toBeNull();
  });
});
