import { describe, expect, test } from "vitest";
import { DAY_END_MINUTES } from "@/features/tasks/schedule";
import { task } from "@/features/testing/fixtures";
import { DEFAULT_WINDOW, hourMarks, visibleWindow } from "./range";

describe("visibleWindow", () => {
  test("saatli görev yokken varsayılan penceredir", () => {
    expect(visibleWindow([])).toEqual(DEFAULT_WINDOW);
    expect(visibleWindow([task({ title: "Saatsiz" })])).toEqual(DEFAULT_WINDOW);
  });

  test("pencere içindeki görevler pencereyi değiştirmez", () => {
    const tasks = [task({ startTime: "09:00", durationMinutes: 60 })];
    expect(visibleWindow(tasks)).toEqual(DEFAULT_WINDOW);
  });

  test("erken görev için tam saate iner", () => {
    const tasks = [task({ startTime: "06:30", durationMinutes: 30 })];
    expect(visibleWindow(tasks).startMinute).toBe(6 * 60);
  });

  test("geç biten görev için tam saate çıkar", () => {
    const tasks = [task({ startTime: "22:30", durationMinutes: 60 })];
    expect(visibleWindow(tasks).endMinute).toBe(DAY_END_MINUTES);
  });

  test("süresiz görev de varsayılan süre kadar yer kaplar", () => {
    // 21:50 + 30 dk = 22:20 → pencere 23:00'e açılır.
    const tasks = [task({ startTime: "21:50" })];
    expect(visibleWindow(tasks).endMinute).toBe(23 * 60);
  });

  test("pencere yalnızca GENİŞLER, daralmaz", () => {
    const tasks = [task({ startTime: "12:00", durationMinutes: 60 })];
    const w = visibleWindow(tasks);
    expect(w.startMinute).toBe(DEFAULT_WINDOW.startMinute);
    expect(w.endMinute).toBe(DEFAULT_WINDOW.endMinute);
  });

  test("iki uçtan birden açılır", () => {
    const tasks = [
      task({ startTime: "05:15", durationMinutes: 30 }),
      task({ startTime: "23:00", durationMinutes: 30 }),
    ];
    expect(visibleWindow(tasks)).toEqual({
      startMinute: 5 * 60,
      endMinute: DAY_END_MINUTES,
    });
  });

  test("geçersiz saatli görev yok sayılır", () => {
    expect(visibleWindow([task({ startTime: "sabah" })])).toEqual(DEFAULT_WINDOW);
  });

  test("pencere dışındaki 'şimdi' dahil edilir", () => {
    // Görünmeyen bir şimdi çizgisinin anlamı yok.
    expect(visibleWindow([], { now: 6 * 60 + 40 }).startMinute).toBe(6 * 60);
    expect(visibleWindow([], { now: 23 * 60 + 10 }).endMinute).toBe(DAY_END_MINUTES);
  });

  test("pencere içindeki 'şimdi' bir şey değiştirmez", () => {
    expect(visibleWindow([], { now: 12 * 60 })).toEqual(DEFAULT_WINDOW);
  });

  test("null 'şimdi' yok sayılır", () => {
    expect(visibleWindow([], { now: null })).toEqual(DEFAULT_WINDOW);
  });

  test("expanded tüm günü açar", () => {
    const tasks = [task({ startTime: "09:00", durationMinutes: 60 })];
    expect(visibleWindow(tasks, { expanded: true })).toEqual({
      startMinute: 0,
      endMinute: DAY_END_MINUTES,
    });
  });

  test("gün sınırlarını aşmaz", () => {
    const tasks = [task({ startTime: "00:10", durationMinutes: 15 })];
    const w = visibleWindow(tasks, { now: 0 });
    expect(w.startMinute).toBe(0);
    expect(w.endMinute).toBeLessThanOrEqual(DAY_END_MINUTES);
  });
});

describe("hourMarks", () => {
  test("her tam saat için bir işaret üretir", () => {
    expect(hourMarks({ startMinute: 8 * 60, endMinute: 11 * 60 })).toEqual([
      480, 540, 600,
    ]);
  });

  test("son sınırı DIŞLAR", () => {
    // 22:00 çizgisi tuvalin alt kenarıdır; orada etiket taşacak yer yok.
    const marks = hourMarks(DEFAULT_WINDOW);
    expect(marks).toHaveLength(14);
    expect(marks.at(-1)).toBe(21 * 60);
  });

  test("boş pencere işaret üretmez", () => {
    expect(hourMarks({ startMinute: 600, endMinute: 600 })).toEqual([]);
  });
});
