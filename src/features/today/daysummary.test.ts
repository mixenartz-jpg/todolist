import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import {
  entriesOn,
  noEntries,
  routine,
  task,
} from "@/features/testing/fixtures";
import { buildDayClose } from "./daysummary";

const TODAY = asDateStr("2026-08-24"); // pazartesi
const YESTERDAY = asDateStr("2026-08-23");

describe("buildDayClose — rutinler", () => {
  it("bugün zorunlu rutinleri sayar", () => {
    const r1 = routine({ id: "r1" });
    const r2 = routine({ id: "r2" });

    const close = buildDayClose({
      entries: entriesOn(r1, { [TODAY]: 1 }),
      routines: [r1, r2],
      tasks: [],
      today: TODAY,
    });

    expect(close.routines).toEqual({ done: 1, total: 2 });
  });

  it("rutin yoksa sıfırlanır, bölme hatası vermez", () => {
    const close = buildDayClose({
      entries: noEntries,
      routines: [],
      tasks: [],
      today: TODAY,
    });

    expect(close.routines).toEqual({ done: 0, total: 0 });
  });
});

describe("buildDayClose — görevler", () => {
  it("bugüne tarihli görevleri sayar", () => {
    const close = buildDayClose({
      entries: noEntries,
      routines: [],
      tasks: [
        task({ id: "t1", dueDate: TODAY, done: true }),
        task({ id: "t2", dueDate: TODAY, done: false }),
      ],
      today: TODAY,
    });

    expect(close.tasks).toEqual({ done: 1, total: 2 });
  });

  it("tarihsiz görevleri saymaz", () => {
    // "Bir ara" kuyruğu günün yükümlülüğü değil; günü kapatırken
    // sayılması, hiç azalmayan bir payda üretirdi.
    const close = buildDayClose({
      entries: noEntries,
      routines: [],
      tasks: [task({ id: "t1", dueDate: null })],
      today: TODAY,
    });

    expect(close.tasks).toEqual({ done: 0, total: 0 });
  });

  it("geçmişten taşan açık görevleri sayar — tasksForDay ile aynı kural", () => {
    // Dünkü yapılmamış görev bugünün ekranında duruyor; gün özetinde
    // yok saymak, ekranda görünenle özetin çelişmesi olurdu.
    const close = buildDayClose({
      entries: noEntries,
      routines: [],
      tasks: [task({ id: "t1", dueDate: YESTERDAY, done: false })],
      today: TODAY,
    });

    expect(close.tasks).toEqual({ done: 0, total: 1 });
  });

  it("geçmişte TAMAMLANMIŞ görevi saymaz", () => {
    const close = buildDayClose({
      entries: noEntries,
      routines: [],
      tasks: [task({ id: "t1", dueDate: YESTERDAY, done: true })],
      today: TODAY,
    });

    expect(close.tasks).toEqual({ done: 0, total: 0 });
  });
});

describe("buildDayClose — dakika", () => {
  it("yalnızca TAMAMLANMIŞ ve SAATLİ görevlerin süresini toplar", () => {
    const close = buildDayClose({
      entries: noEntries,
      routines: [],
      tasks: [
        task({
          id: "t1",
          dueDate: TODAY,
          done: true,
          startTime: "09:00",
          durationMinutes: 60,
        }),
        // Tamamlanmamış: planlanmış ama yapılmamış zaman sayılmaz.
        task({
          id: "t2",
          dueDate: TODAY,
          done: false,
          startTime: "11:00",
          durationMinutes: 30,
        }),
        // Saatsiz: süresi yok.
        task({ id: "t3", dueDate: TODAY, done: true }),
      ],
      today: TODAY,
    });

    expect(close.minutes).toBe(60);
  });

  it("saatli görev yoksa sıfırdır", () => {
    const close = buildDayClose({
      entries: noEntries,
      routines: [],
      tasks: [task({ id: "t1", dueDate: TODAY, done: true })],
      today: TODAY,
    });

    expect(close.minutes).toBe(0);
  });
});

describe("buildDayClose — hiç iş yokken", () => {
  it("her alanı sıfır döner", () => {
    const close = buildDayClose({
      entries: noEntries,
      routines: [],
      tasks: [],
      today: TODAY,
    });

    expect(close).toEqual({
      routines: { done: 0, total: 0 },
      tasks: { done: 0, total: 0 },
      minutes: 0,
    });
  });
});
