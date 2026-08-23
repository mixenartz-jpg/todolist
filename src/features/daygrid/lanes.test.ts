import { describe, expect, test } from "vitest";
import { task } from "@/features/testing/fixtures";
import { laneGeometry, packLanes } from "./lanes";

/** Test okunurluğu: id → [lane, laneCount]. */
function layout(items: ReturnType<typeof packLanes>) {
  return Object.fromEntries(
    items.map((i) => [i.task.id, [i.lane, i.laneCount]]),
  );
}

describe("packLanes", () => {
  test("boş girdi boş sonuç verir", () => {
    expect(packLanes([])).toEqual([]);
  });

  test("saatsiz görevleri dışarıda bırakır", () => {
    const items = packLanes([task({ id: "a" }), task({ id: "b", startTime: "09:00" })]);
    expect(items.map((i) => i.task.id)).toEqual(["b"]);
  });

  test("çakışmayan görevlerin hepsi tek şeritte", () => {
    const items = packLanes([
      task({ id: "a", startTime: "09:00", durationMinutes: 60 }),
      task({ id: "b", startTime: "11:00", durationMinutes: 60 }),
    ]);
    expect(layout(items)).toEqual({ a: [0, 1], b: [0, 1] });
  });

  test("değen aralıklar çakışma sayılmaz", () => {
    // overlaps() ile aynı kural: 09-10 ile 10-11 arka arkayadır.
    const items = packLanes([
      task({ id: "a", startTime: "09:00", durationMinutes: 60 }),
      task({ id: "b", startTime: "10:00", durationMinutes: 60 }),
    ]);
    expect(layout(items)).toEqual({ a: [0, 1], b: [0, 1] });
  });

  test("tam çakışan iki görev iki şerit açar", () => {
    const items = packLanes([
      task({ id: "a", startTime: "09:00", durationMinutes: 60 }),
      task({ id: "b", startTime: "09:00", durationMinutes: 60 }),
    ]);
    expect(layout(items)).toEqual({ a: [0, 2], b: [1, 2] });
  });

  test("zincir çakışmada üçüncü görev ilk şeride DÖNER", () => {
    /*
     * A(09-11) B(10-12) C(11-13): C aslında A ile çakışmıyor, o yüzden
     * A'nın şeridini geri alır. Ama üçü tek küme olduğu için laneCount
     * hepsinde 2'dir — sezgiye aykırı ve tam da bu yüzden sabitleniyor.
     */
    const items = packLanes([
      task({ id: "a", startTime: "09:00", durationMinutes: 120 }),
      task({ id: "b", startTime: "10:00", durationMinutes: 120 }),
      task({ id: "c", startTime: "11:00", durationMinutes: 120 }),
    ]);
    expect(layout(items)).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2] });
  });

  test("üçlü çakışma üç şerit açar", () => {
    const items = packLanes([
      task({ id: "a", startTime: "09:00", durationMinutes: 60 }),
      task({ id: "b", startTime: "09:15", durationMinutes: 60 }),
      task({ id: "c", startTime: "09:30", durationMinutes: 60 }),
    ]);
    expect(layout(items)).toEqual({ a: [0, 3], b: [1, 3], c: [2, 3] });
  });

  test("ayrı kümeler birbirini DARALTMAZ", () => {
    // Sabahki çakışma akşamki yalnız bloğu tam genişlikte bırakmalı.
    const items = packLanes([
      task({ id: "a", startTime: "09:00", durationMinutes: 60 }),
      task({ id: "b", startTime: "09:00", durationMinutes: 60 }),
      task({ id: "yalnız", startTime: "17:00", durationMinutes: 60 }),
    ]);
    expect(layout(items)).toEqual({ a: [0, 2], b: [1, 2], yalnız: [0, 1] });
  });

  test("süresiz görev varsayılan süre kadar yer kaplar", () => {
    // 09:00 süresiz (→ 09:30'a kadar) ile 09:15 çakışır.
    const items = packLanes([
      task({ id: "a", startTime: "09:00" }),
      task({ id: "b", startTime: "09:15", durationMinutes: 30 }),
    ]);
    expect(items.find((i) => i.task.id === "a")!.endMinute).toBe(9 * 60 + 30);
    expect(layout(items)).toEqual({ a: [0, 2], b: [1, 2] });
  });

  test("gün sonunu aşan blok kırpılır", () => {
    const items = packLanes([
      task({ id: "a", startTime: "23:30", durationMinutes: 120 }),
    ]);
    expect(items[0].endMinute).toBe(24 * 60);
  });

  test("girdi sırası sonucu DEĞİŞTİRMEZ", () => {
    /*
     * Sıralama splitDaySchedule'a devredildi; bu test o bağı korur.
     * Oradaki kural değişirse burası kırılır ve şerit atamalarının
     * sessizce kaymadığını fark ederiz.
     */
    const tasks = [
      task({ id: "a", startTime: "09:00", durationMinutes: 60 }),
      task({ id: "b", startTime: "09:30", durationMinutes: 60 }),
      task({ id: "c", startTime: "14:00", durationMinutes: 60 }),
    ];
    expect(layout(packLanes(tasks))).toEqual(
      layout(packLanes([...tasks].reverse())),
    );
  });
});

describe("laneGeometry", () => {
  test("tek şerit tam genişliktir", () => {
    const [item] = packLanes([task({ id: "a", startTime: "09:00" })]);
    expect(laneGeometry(item)).toEqual({ leftPct: 0, widthPct: 100 });
  });

  test("iki şerit alanı tam bölüşür — bindirme YOK", () => {
    const items = packLanes([
      task({ id: "a", startTime: "09:00", durationMinutes: 60 }),
      task({ id: "b", startTime: "09:00", durationMinutes: 60 }),
    ]);
    expect(laneGeometry(items[0])).toEqual({ leftPct: 0, widthPct: 50 });
    expect(laneGeometry(items[1])).toEqual({ leftPct: 50, widthPct: 50 });
  });
});
