import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { Task } from "@/features/tasks/types";
import { sourceProgress, unionLength } from "./progress";
import type { Source } from "./types";

const src = (id: string, title: string, total = 100, aliases: string[] = []): Source => ({
  id, title, subject: null, totalTests: total, unit: "test", aliases, sortOrder: 0, archivedAt: null,
});
const SOURCES = [
  src("kd", "Kafadengi Matematik", 60),
  src("gm", "Güçlendiren Matematik", 80),
  src("fz", "345 AYT Fizik", 400),
  src("lgs", "LGS Çıkmış Sorular", 50, ["LGS Çıkmış"]),
];

function task(title: string, done = false, extra: Partial<Task> = {}): Task {
  return {
    id: title, title, dueDate: asDateStr("2026-11-14"), done, note: null, sortOrder: 0,
    completedAt: null, categoryId: null, goalId: null, nodeId: null, colorSlot: null,
    estimateMinutes: null, ...extra,
  };
}

describe("ilerleme", () => {
  it("aralık birleşimi tekrar saymaz ve sınırlara kırpar", () => {
    expect(unionLength([{ from: 1, to: 10 }, { from: 5, to: 15 }, { from: 20, to: 20 }], 100)).toBe(16);
    expect(unionLength([{ from: 1, to: 5 }, { from: 6, to: 8 }], 100)).toBe(8);
    expect(unionLength([{ from: 55, to: 70 }], 60)).toBe(6);
    expect(unionLength([], 60)).toBe(0);
  });

  it("yalnızca açık bağlı ve tamamlanan görevler sayılır; başlıktan eşleşme yok", () => {
    const link = (from: number | null, to: number | null) => ({ sourceId: "kd", rangeFrom: from, rangeTo: to });
    const tasks = [
      task("a", true, link(1, 10)),
      task("b", true, link(8, 15)),
      task("c", false, link(16, 30)),
      task("d", true, link(null, null)),
      task("Kafadengi Mat | Üslü | 40-50", true),
    ];
    const kd = sourceProgress(SOURCES, tasks).find((p) => p.source.id === "kd")!;
    expect(kd.covered).toBe(15);
    expect(kd.ratio).toBeCloseTo(0.25);
    expect(kd.taskCount).toBe(4);
    expect(kd.doneCount).toBe(3);
    expect(kd.doneWithoutRange).toBe(1);
  });
});
