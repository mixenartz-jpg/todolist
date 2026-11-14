import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { TaskResult } from "@/features/results/types";
import type { Task } from "@/features/tasks/types";
import {
  autoAdvance,
  derivedSourceStatus,
  freeRuns,
  nextFreeRun,
  nextFreeUnits,
  progressRatio,
  sectionUnitStates,
  summarize,
  type LinkedTask,
  type UnitMark,
} from "./unitStatus";

function task(id: string, due: string, extra: Partial<Task> = {}): Task {
  return {
    id, title: id, dueDate: asDateStr(due), done: false, note: null, sortOrder: 0, completedAt: null,
    categoryId: null, goalId: null, nodeId: null, colorSlot: null, estimateMinutes: null, ...extra,
  };
}
function result(t: Task, o: Partial<TaskResult>): TaskResult {
  return {
    taskId: t.id, date: t.dueDate!, studentId: "s", status: null, total: null, correct: null, wrong: null,
    empty: null, actualMinutes: null, missingTopics: [], reason: null, note: null, doneOn: null, updatedAt: "",
    ...o,
  };
}
const link = (t: Task, units: number[], r: Partial<TaskResult> | null = null, doneUnits?: number[]): LinkedTask => ({
  task: t,
  units,
  result: r ? result(t, r) : null,
  doneUnits: doneUnits ? new Set(doneUnits) : undefined,
});
const mark = (from: number, to: number, status: UnitMark["status"], at = "2026-11-10T10:00:00Z"): UnitMark => ({
  from, to, status, markedAt: at, note: null,
});
const colors = (links: LinkedTask[], marks: UnitMark[] = [], from = 1, to = 6) =>
  sectionUnitStates({ from, to, links, marks }).map((s) => `${s.color[0]}${s.manual ? "*" : ""}`).join(" ");

describe("kutucuk durum önceliği", () => {
  it("altı durum: görev done > elle done > görev bekliyor > elle ödev > kırmızı > gri", () => {
    const done = task("done", "2026-11-10");
    const pending = task("pending", "2026-11-12");
    const skipped = task("skipped", "2026-11-09");
    const s = colors(
      [link(done, [1], { status: "done" }), link(pending, [3]), link(skipped, [5], { status: "skipped" })],
      [mark(2, 2, "done"), mark(4, 4, "assigned")],
    );
    expect(s).toBe("g g* y y* r g");
  });

  it("görev sonucu elle işaretin önüne geçer", () => {
    const t = task("t", "2026-11-12");
    // Elle "çözüldü" ama görev yapılmadı → elle done (2) > kırmızı (5): yeşil kalır.
    expect(colors([link(t, [1], { status: "skipped" })], [mark(1, 1, "done")], 1, 1)).toBe("g*");
    // Elle "ödevlendirildi" + görev done → görev (1) kazanır, elle ikonu yok.
    expect(colors([link(t, [1], { status: "done" })], [mark(1, 1, "assigned")], 1, 1)).toBe("g");
    // Elle "ödevlendirildi" + sonuçsuz görev → görev bekliyor (3), elle değil.
    expect(colors([link(t, [1])], [mark(1, 1, "assigned")], 1, 1)).toBe("y");
  });

  it("görev silinince kutucuk eski hâline döner (durum türetilir, saklanmaz)", () => {
    const t = task("t", "2026-11-12");
    const marks = [mark(1, 1, "assigned"), mark(2, 2, "done")];
    expect(colors([link(t, [1, 2, 3])], marks, 1, 4)).toBe("y g* y g");
    // Görev silindi → bağ listesinden çıkar; elle işaretler yeniden görünür.
    expect(colors([], marks, 1, 4)).toBe("y* g* g g");
  });

  it("çakışan elle işaretlerde yenisi geçerli", () => {
    const marks = [mark(1, 5, "assigned", "2026-11-01T00:00:00Z"), mark(3, 4, "done", "2026-11-05T00:00:00Z")];
    expect(colors([], marks, 1, 5)).toBe("y* y* g* g* y*");
  });

  it("koç işaretlemiş (task.done) ama sonucu olmayan görev yeşil", () => {
    expect(colors([link(task("t", "2026-11-10", { done: true }), [1])], [], 1, 1)).toBe("g");
  });
});

describe("yarım görev ve İlerlet", () => {
  it("yarım görevde yalnızca işaretlenen testler yeşil, kalanı kırmızı", () => {
    const t = task("t", "2026-11-12");
    expect(colors([link(t, [1, 2, 3, 4], { status: "partial" }, [1, 3])], [], 1, 4)).toBe("g r g r");
  });

  it("İlerlet: [başlangıç, reached_to] sayılır, rezervasyonun kalanı havuza döner", () => {
    const t = task("t", "2026-11-12", { targetAmount: 5, rangeFrom: 2, rangeTo: 6 });
    const s = sectionUnitStates({ from: 1, to: 7, links: [link(t, [2, 3, 4, 5, 6], { status: "done", reachedTo: 4 })], marks: [] });
    expect(s.map((x) => x.color)).toEqual(["gray", "green", "green", "green", "red", "red", "gray"]);
  });

  it("İlerlet sonuç girilmeden hedef kadar birimi rezerve eder (sarı)", () => {
    const t = task("t", "2026-11-12", { targetAmount: 3, rangeFrom: 1, rangeTo: 3 });
    const s = sectionUnitStates({ from: 1, to: 5, links: [link(t, [1, 2, 3])], marks: [] });
    expect(s.map((x) => x.color)).toEqual(["yellow", "yellow", "yellow", "gray", "gray"]);
  });

  it("aralık biriminde yarım + reached_to: ulaşılan kısım yeşil", () => {
    const t = task("t", "2026-11-12", { rangeFrom: 10, rangeTo: 14 });
    const s = sectionUnitStates({ from: 10, to: 14, links: [link(t, [10, 11, 12, 13, 14], { status: "partial", reachedTo: 11 })], marks: [] });
    expect(s.map((x) => x.color)).toEqual(["green", "green", "red", "red", "red"]);
  });
});

describe("ilerleme ve sıradaki birim", () => {
  const t1 = task("a", "2026-11-10");
  const t2 = task("b", "2026-11-12");
  const states = sectionUnitStates({
    from: 1,
    to: 10,
    links: [link(t1, [1, 2], { status: "done" }), link(t1, [3], { status: "skipped" }), link(t2, [4, 5])],
    marks: [mark(6, 6, "assigned"), mark(8, 8, "done")],
  });

  it("ilerleme yalnızca yeşil; aynı birim iki kez sayılmaz", () => {
    const s = summarize(states);
    expect(s).toEqual({ total: 10, green: 3, yellow: 3, red: 1, gray: 3 });
    expect(progressRatio(s)).toBeCloseTo(0.3);
  });

  it("sıradaki: gri ve kırmızı boş; atanmış/ödevlendirilmiş atlanır", () => {
    expect(nextFreeUnits(states, 3)).toEqual([3, 7, 9]);
    expect(nextFreeRun(states, 5)).toEqual({ from: 3, to: 3 });
    expect(freeRuns(states)).toEqual([
      { from: 3, to: 3 },
      { from: 7, to: 7 },
      { from: 9, to: 10 },
    ]);
  });

  it("ardışık boş parça en fazla istenen uzunluk", () => {
    const empty = sectionUnitStates({ from: 120, to: 200, links: [], marks: [] });
    expect(nextFreeRun(empty, 10)).toEqual({ from: 120, to: 129 });
  });

  it("kaynak durumu otomatik ilerler, geri gitmez", () => {
    expect(derivedSourceStatus({ total: 4, green: 0, yellow: 0, red: 0, gray: 4 }, false)).toBe("sirada");
    expect(derivedSourceStatus({ total: 4, green: 0, yellow: 1, red: 0, gray: 3 }, true)).toBe("devam");
    expect(derivedSourceStatus({ total: 4, green: 4, yellow: 0, red: 0, gray: 0 }, true)).toBe("bitti");
    expect(autoAdvance("sirada", "devam")).toBe("devam");
    expect(autoAdvance("bitti", "devam")).toBeNull();
    expect(autoAdvance("devam", "devam")).toBeNull();
  });
});
