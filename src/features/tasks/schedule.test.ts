import { describe, expect, test } from "vitest";
import {
  DAY_END_MINUTES,
  endMinutes,
  formatDuration,
  formatTime,
  overlaps,
  parseTime,
  splitDaySchedule,
} from "./schedule";
import type { Task } from "./types";

function task(partial: Partial<Task> & { id: string }): Task {
  return {
    title: "Görev",
    dueDate: null,
    done: false,
    note: null,
    sortOrder: 0,
    startTime: null,
    durationMinutes: null,
    categoryId: null,
    goalId: null,
    ...partial,
  };
}

describe("parseTime", () => {
  test("'HH:MM' biçimini çözer", () => {
    expect(parseTime("09:00")).toBe(540);
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("23:59")).toBe(1439);
  });

  test("saniyeli biçimi de çözer", () => {
    // Postgres `time` supabase-js'e 'HH:MM:SS' olarak gelir.
    expect(parseTime("09:00:00")).toBe(540);
  });

  test("geçersiz saati reddeder", () => {
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("09:60")).toBeNull();
  });

  test("çöp girdiyi reddeder", () => {
    // Sessizce 0 dönmek geçersiz saati gece yarısına çevirirdi.
    expect(parseTime("")).toBeNull();
    expect(parseTime("sabah")).toBeNull();
    expect(parseTime("9:00")).toBeNull();
  });
});

describe("formatTime", () => {
  test("başa sıfır ekler", () => {
    expect(formatTime(540)).toBe("09:00");
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(1439)).toBe("23:59");
  });

  test("parseTime ile gidiş-dönüş kararlıdır", () => {
    expect(parseTime(formatTime(725))).toBe(725);
  });
});

describe("endMinutes", () => {
  test("süreyi başlangıca ekler", () => {
    expect(endMinutes(540, 45)).toBe(585);
  });

  test("süre yoksa başlangıcı döner", () => {
    expect(endMinutes(540, null)).toBe(540);
  });

  test("gece yarısını aşarsa kırpar", () => {
    // Gün planı ertesi güne taşmamalı.
    expect(endMinutes(1400, 120)).toBe(DAY_END_MINUTES);
  });
});

describe("formatDuration", () => {
  test("bir saatin altını dakika olarak yazar", () => {
    expect(formatDuration(45)).toBe("45 dk");
    expect(formatDuration(5)).toBe("5 dk");
  });

  test("tam saatlerde dakika kısmını YAZMAZ", () => {
    expect(formatDuration(120)).toBe("2 sa");
    expect(formatDuration(60)).toBe("1 sa");
  });

  test("karışık süreyi ikisiyle yazar", () => {
    expect(formatDuration(90)).toBe("1 sa 30 dk");
    expect(formatDuration(135)).toBe("2 sa 15 dk");
  });
});

describe("splitDaySchedule", () => {
  test("saatlileri saate göre artan sıralar", () => {
    const tasks = [
      task({ id: "c", startTime: "14:00" }),
      task({ id: "a", startTime: "09:00" }),
      task({ id: "b", startTime: "11:30" }),
    ];

    expect(splitDaySchedule(tasks).timed.map((t) => t.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  test("saatsizlerin sırasını KORUR", () => {
    const tasks = [
      task({ id: "z", sortOrder: 5 }),
      task({ id: "a", sortOrder: 1 }),
    ];

    expect(splitDaySchedule(tasks).untimed.map((t) => t.id)).toEqual(["z", "a"]);
  });

  test("iki grubu ayırır", () => {
    const tasks = [
      task({ id: "timed", startTime: "09:00" }),
      task({ id: "untimed" }),
    ];

    const { timed, untimed } = splitDaySchedule(tasks);
    expect(timed.map((t) => t.id)).toEqual(["timed"]);
    expect(untimed.map((t) => t.id)).toEqual(["untimed"]);
  });

  test("eşit saatte sıra sortOrder sonra id ile deterministiktir", () => {
    const tasks = [
      task({ id: "b", startTime: "09:00", sortOrder: 1 }),
      task({ id: "a", startTime: "09:00", sortOrder: 1 }),
      task({ id: "c", startTime: "09:00", sortOrder: 0 }),
    ];

    const first = splitDaySchedule(tasks).timed.map((t) => t.id);
    const second = splitDaySchedule([...tasks].reverse()).timed.map((t) => t.id);

    expect(first).toEqual(["c", "a", "b"]);
    expect(first).toEqual(second);
  });

  test("geçersiz saatli görev saatsiz sayılır", () => {
    const tasks = [task({ id: "bozuk", startTime: "sabah" })];
    expect(splitDaySchedule(tasks).untimed.map((t) => t.id)).toEqual(["bozuk"]);
  });

  test("boş girdi iki boş grup döner", () => {
    expect(splitDaySchedule([])).toEqual({ timed: [], untimed: [] });
  });
});

describe("overlaps", () => {
  test("değen aralıklar ÇAKIŞMAZ", () => {
    // 09:00-10:00 ile 10:00-11:00 arka arkayadır.
    const a = task({ id: "a", startTime: "09:00", durationMinutes: 60 });
    const b = task({ id: "b", startTime: "10:00", durationMinutes: 60 });
    expect(overlaps(a, b)).toBe(false);
  });

  test("gerçek çakışmayı yakalar", () => {
    const a = task({ id: "a", startTime: "09:00", durationMinutes: 90 });
    const b = task({ id: "b", startTime: "10:00", durationMinutes: 60 });
    expect(overlaps(a, b)).toBe(true);
    expect(overlaps(b, a)).toBe(true);
  });

  test("süresiz görevler çakışmaz", () => {
    const a = task({ id: "a", startTime: "09:00" });
    const b = task({ id: "b", startTime: "09:00" });
    expect(overlaps(a, b)).toBe(false);
  });

  test("saatsiz görev asla çakışmaz", () => {
    const a = task({ id: "a", startTime: "09:00", durationMinutes: 60 });
    expect(overlaps(a, task({ id: "b" }))).toBe(false);
  });
});
