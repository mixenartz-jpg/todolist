import { describe, expect, test } from "vitest";
import { DAY_END_MINUTES } from "@/features/tasks/schedule";
import {
  canvasHeight,
  clampDuration,
  clampStart,
  MIN_DURATION,
  minuteToY,
  snapMinutes,
  yToMinute,
  type GridMetrics,
} from "./geometry";

/** 08:00–22:00, saat başı 60px — masaüstü varsayılanı. */
const metrics: GridMetrics = {
  hourHeight: 60,
  startMinute: 8 * 60,
  endMinute: 22 * 60,
};

describe("minuteToY / yToMinute", () => {
  test("pencerenin başı tuvalin tepesidir", () => {
    expect(minuteToY(8 * 60, metrics)).toBe(0);
  });

  test("bir saat bir satır yüksekliğindedir", () => {
    expect(minuteToY(9 * 60, metrics)).toBe(60);
    expect(minuteToY(9 * 60 + 30, metrics)).toBe(90);
  });

  test("pencere dışı dakika da çevrilir", () => {
    // Kırpma çağıranın işi; geometri sadece çeviri yapar.
    expect(minuteToY(7 * 60, metrics)).toBe(-60);
  });

  test("gidiş-dönüş kararlıdır", () => {
    expect(yToMinute(minuteToY(725, metrics), metrics)).toBeCloseTo(725);
    expect(minuteToY(yToMinute(137, metrics), metrics)).toBeCloseTo(137);
  });

  test("negatif y pencere öncesine düşer", () => {
    expect(yToMinute(-60, metrics)).toBe(7 * 60);
  });
});

describe("canvasHeight", () => {
  test("pencere uzunluğu × satır yüksekliği", () => {
    expect(canvasHeight(metrics)).toBe(14 * 60);
  });

  test("satır yüksekliği değişince ölçek de değişir", () => {
    expect(canvasHeight({ ...metrics, hourHeight: 52 })).toBe(14 * 52);
  });
});

describe("snapMinutes", () => {
  test("en yakın 15 dakikaya yuvarlar", () => {
    expect(snapMinutes(0)).toBe(0);
    expect(snapMinutes(15)).toBe(15);
    expect(snapMinutes(16)).toBe(15);
    expect(snapMinutes(22)).toBe(15);
  });

  test("yarı yolda yukarı yuvarlar", () => {
    // 7 aşağı, 8 yukarı — sınırın hangi tarafta olduğu testte sabitlenir.
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(8)).toBe(15);
  });

  test("adım verilebilir", () => {
    expect(snapMinutes(37, 30)).toBe(30);
    expect(snapMinutes(46, 30)).toBe(60);
  });
});

describe("clampStart", () => {
  test("pencere içindeki değeri değiştirmez", () => {
    expect(clampStart(10 * 60, 60, metrics)).toBe(10 * 60);
  });

  test("pencerenin başından öncesini yukarı iter", () => {
    expect(clampStart(6 * 60, 60, metrics)).toBe(8 * 60);
  });

  test("sonu aşan bloğu geriye iter, SÜREYİ KISALTMAZ", () => {
    // 2 saatlik blok 21:30'a bırakılırsa 20:00'ye oturur — 30 dakikaya
    // inmez. Taşımak bir süre düzenlemesi değildir.
    expect(clampStart(21 * 60 + 30, 120, metrics)).toBe(20 * 60);
  });

  test("süresiz blok pencerenin son dakikasına kadar gidebilir", () => {
    expect(clampStart(23 * 60, null, metrics)).toBe(22 * 60);
  });

  test("gün sonu penceresinde günün sonunu aşamaz", () => {
    const full: GridMetrics = {
      hourHeight: 60,
      startMinute: 0,
      endMinute: DAY_END_MINUTES,
    };
    expect(clampStart(23 * 60 + 30, 120, full)).toBe(DAY_END_MINUTES - 120);
  });

  test("blok pencereden uzunsa başlangıç pencerenin başında kalır", () => {
    const narrow: GridMetrics = {
      hourHeight: 60,
      startMinute: 8 * 60,
      endMinute: 9 * 60,
    };
    expect(clampStart(8 * 60 + 30, 120, narrow)).toBe(8 * 60);
  });
});

describe("clampDuration", () => {
  test("aralıktaki süreyi değiştirmez", () => {
    expect(clampDuration(10 * 60, 90, metrics)).toBe(90);
  });

  test("MIN_DURATION tabanını uygular", () => {
    expect(clampDuration(10 * 60, 5, metrics)).toBe(MIN_DURATION);
    expect(clampDuration(10 * 60, 0, metrics)).toBe(MIN_DURATION);
  });

  test("pencerenin sonunu aşan süreyi kırpar", () => {
    expect(clampDuration(21 * 60, 180, metrics)).toBe(60);
  });

  test("yer kalmasa bile MIN_DURATION altına inmez", () => {
    // Pencerenin son dakikasında: kırpma 0 verirdi, taban onu kurtarır.
    expect(clampDuration(22 * 60, 60, metrics)).toBe(MIN_DURATION);
  });
});
