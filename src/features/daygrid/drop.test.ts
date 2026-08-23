import { describe, expect, test } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { task } from "@/features/testing/fixtures";
import { isPendingTask, pendingTaskId, resolveDrop } from "./drop";

const MON = asDateStr("2026-03-16");
const TUE = asDateStr("2026-03-17");

describe("isPendingTask", () => {
  test("geçici kimliği tanır", () => {
    expect(isPendingTask(pendingTaskId())).toBe(true);
  });

  test("gerçek kimliği tanımaz", () => {
    expect(isPendingTask("d3f1c0a2-0000-4000-8000-000000000000")).toBe(false);
  });
});

describe("resolveDrop", () => {
  test("aynı yuvaya bırakma yazma üretmez", () => {
    // Eşiği geçmiş ama yerinde bırakılmış sürükleme.
    const t = task({ dueDate: MON, startTime: "09:00", durationMinutes: 60 });
    expect(
      resolveDrop({
        task: t,
        targetDate: MON,
        targetStart: 9 * 60,
        targetDuration: 60,
      }),
    ).toEqual({ kind: "none" });
  });

  test("gün içinde saat değişimi 'time' üretir", () => {
    const t = task({ id: "x", dueDate: MON, startTime: "09:00", durationMinutes: 60 });
    expect(
      resolveDrop({
        task: t,
        targetDate: MON,
        targetStart: 10 * 60 + 30,
        targetDuration: 60,
      }),
    ).toEqual({
      kind: "time",
      id: "x",
      startTime: "10:30",
      durationMinutes: 60,
    });
  });

  test("yalnızca süre değişimi de 'time' üretir", () => {
    const t = task({ id: "x", dueDate: MON, startTime: "09:00", durationMinutes: 60 });
    expect(
      resolveDrop({
        task: t,
        targetDate: MON,
        targetStart: 9 * 60,
        targetDuration: 90,
      }),
    ).toEqual({
      kind: "time",
      id: "x",
      startTime: "09:00",
      durationMinutes: 90,
    });
  });

  test("başka güne taşıma tek 'move' üretir", () => {
    // İki ayrı mutasyon değil: bkz. useMoveTask gerekçesi.
    const t = task({ id: "x", dueDate: MON, startTime: "09:00", durationMinutes: 60 });
    expect(
      resolveDrop({
        task: t,
        targetDate: TUE,
        targetStart: 14 * 60,
        targetDuration: 60,
      }),
    ).toEqual({
      kind: "move",
      id: "x",
      dueDate: TUE,
      startTime: "14:00",
      durationMinutes: 60,
    });
  });

  test("saatsiz şeride bırakma 'unschedule' üretir", () => {
    const t = task({ id: "x", dueDate: MON, startTime: "09:00", durationMinutes: 60 });
    expect(
      resolveDrop({
        task: t,
        targetDate: MON,
        targetStart: null,
        targetDuration: null,
      }),
    ).toEqual({ kind: "unschedule", id: "x" });
  });

  test("zaten saatsiz görev şeride bırakılırsa yazma olmaz", () => {
    const t = task({ id: "x", dueDate: MON });
    expect(
      resolveDrop({
        task: t,
        targetDate: MON,
        targetStart: null,
        targetDuration: null,
      }),
    ).toEqual({ kind: "none" });
  });

  test("şeritten ızgaraya bırakma 'schedule' üretir", () => {
    const t = task({ id: "x", dueDate: MON });
    expect(
      resolveDrop({
        task: t,
        targetDate: MON,
        targetStart: 11 * 60 + 15,
        targetDuration: 30,
      }),
    ).toEqual({
      kind: "schedule",
      id: "x",
      dueDate: MON,
      startTime: "11:15",
      durationMinutes: 30,
    });
  });

  test("şeritten başka günün ızgarasına da 'schedule' üretir", () => {
    // Gün ve saat aynı yazmada gider; ayrıca 'move' gerekmiyor.
    const t = task({ id: "x", dueDate: MON });
    const intent = resolveDrop({
      task: t,
      targetDate: TUE,
      targetStart: 11 * 60,
      targetDuration: null,
    });
    expect(intent).toEqual({
      kind: "schedule",
      id: "x",
      dueDate: TUE,
      startTime: "11:00",
      durationMinutes: 30,
    });
  });

  test("henüz yazılmamış görev sürüklenemez", () => {
    // Geçici kimliğe yapılan yazma var olmayan satıra gider.
    const t = task({ id: pendingTaskId(), dueDate: MON, startTime: "09:00" });
    expect(
      resolveDrop({
        task: t,
        targetDate: TUE,
        targetStart: 14 * 60,
        targetDuration: 60,
      }),
    ).toEqual({ kind: "none" });
  });

  test("süresiz görevin süresi taşımada null kalır", () => {
    /*
     * Yalnızca TAŞINAN bir blok süre KAZANMAMALI: kullanıcı
     * boyutlandırma tutamağına dokunmadıysa süre olduğu gibi kalır.
     * `useDragBlock` bir ara önizlemeyi `?? DEFAULT_DURATION` ile
     * tohumluyordu ve sade bir sürükleme sessizce 30 dakika yazıyordu.
     */
    const t = task({ id: "x", dueDate: MON, startTime: "09:00" });
    expect(
      resolveDrop({
        task: t,
        targetDate: MON,
        targetStart: 10 * 60,
        targetDuration: null,
      }),
    ).toEqual({
      kind: "time",
      id: "x",
      startTime: "10:00",
      durationMinutes: null,
    });
  });

  test("süresiz görev başka güne taşınırken de süresiz kalır", () => {
    const t = task({ id: "x", dueDate: MON, startTime: "09:00" });
    expect(
      resolveDrop({
        task: t,
        targetDate: TUE,
        targetStart: 9 * 60,
        targetDuration: null,
      }),
    ).toEqual({
      kind: "move",
      id: "x",
      dueDate: TUE,
      startTime: "09:00",
      durationMinutes: null,
    });
  });
});
