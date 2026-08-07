import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { isOverdue, tasksForDay, undatedTasks } from "./queries";
import type { Task } from "./types";

const d = asDateStr;
const TODAY = d("2026-08-19");

function task(partial: Partial<Task> & { id: string }): Task {
  return {
    title: "Görev",
    dueDate: null,
    done: false,
    note: null,
    sortOrder: 0,
    startTime: null,
    durationMinutes: null,
    ...partial,
  };
}

describe("tasksForDay", () => {
  it("o güne tarihlenenleri döndürür", () => {
    const tasks = [
      task({ id: "a", dueDate: TODAY }),
      task({ id: "b", dueDate: d("2026-08-20") }),
    ];
    expect(tasksForDay(tasks, TODAY).map((t) => t.id)).toEqual(["a"]);
  });

  it("GEÇMİŞTE kalmış tamamlanmamışları da taşır", () => {
    // Dünkü yapılmamış görev sessizce kaybolmamalı.
    const tasks = [task({ id: "gecmis", dueDate: d("2026-08-17"), done: false })];
    expect(tasksForDay(tasks, TODAY).map((t) => t.id)).toEqual(["gecmis"]);
  });

  it("geçmişte TAMAMLANMIŞ görevleri taşımaz", () => {
    const tasks = [task({ id: "bitti", dueDate: d("2026-08-17"), done: true })];
    expect(tasksForDay(tasks, TODAY)).toEqual([]);
  });

  it("o günün tamamlanmış görevini gösterir", () => {
    // Bugün yaptığın şey listeden kaybolmamalı — yaptığını görmek gerekir.
    const tasks = [task({ id: "a", dueDate: TODAY, done: true })];
    expect(tasksForDay(tasks, TODAY).map((t) => t.id)).toEqual(["a"]);
  });

  it("gelecekteki görevleri göstermez", () => {
    const tasks = [task({ id: "yarin", dueDate: d("2026-08-20") })];
    expect(tasksForDay(tasks, TODAY)).toEqual([]);
  });

  it("tarihsiz görevleri güne katmaz", () => {
    const tasks = [task({ id: "tarihsiz", dueDate: null })];
    expect(tasksForDay(tasks, TODAY)).toEqual([]);
  });
});

describe("undatedTasks", () => {
  it("yalnızca tarihsizleri döndürür", () => {
    const tasks = [
      task({ id: "a", dueDate: null }),
      task({ id: "b", dueDate: TODAY }),
    ];
    expect(undatedTasks(tasks).map((t) => t.id)).toEqual(["a"]);
  });
});

describe("isOverdue", () => {
  it("geçmiş ve tamamlanmamışsa true", () => {
    expect(isOverdue(task({ id: "a", dueDate: d("2026-08-17") }), TODAY)).toBe(true);
  });

  it("geçmiş ama tamamlanmışsa false", () => {
    expect(
      isOverdue(task({ id: "a", dueDate: d("2026-08-17"), done: true }), TODAY),
    ).toBe(false);
  });

  it("bugünse false — gün bitmedi", () => {
    expect(isOverdue(task({ id: "a", dueDate: TODAY }), TODAY)).toBe(false);
  });

  it("tarihsizse false", () => {
    expect(isOverdue(task({ id: "a", dueDate: null }), TODAY)).toBe(false);
  });
});
