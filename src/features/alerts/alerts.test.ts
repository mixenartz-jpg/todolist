import { describe, expect, it } from "vitest";
import { addDays, asDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { DailyLog, TaskResult } from "@/features/results/types";
import type { Task } from "@/features/tasks/types";
import { computeAlerts } from "./alerts";
import { ALERT_THRESHOLDS } from "./thresholds";

const today = asDateStr("2026-11-14");
const d = (n: number): DateStr => addDays(today, n);

function task(id: string, due: DateStr, done: boolean, title = id): Task {
  return {
    id, title, dueDate: due, done, note: null, sortOrder: 0, completedAt: null,
    categoryId: null, goalId: null, nodeId: null, colorSlot: null, estimateMinutes: null,
  };
}
function log(date: DateStr, o: Partial<DailyLog> = {}): DailyLog {
  return {
    studentId: "s", date, sleepAt: null, wakeAt: null, studyBucket: 3, screenBucket: null,
    energy: null, note: null, updatedAt: "", ...o,
  };
}
function skipped(taskId: string, date: DateStr): TaskResult {
  return {
    taskId, date, studentId: "s", status: "skipped", total: null, correct: null, wrong: null,
    empty: null, actualMinutes: null, missingTopics: [], reason: null, note: null, updatedAt: "",
  };
}
const kinds = (a: ReturnType<typeof computeAlerts>) => a.map((x) => x.kind);

describe("computeAlerts", () => {
  it("her şey yolundaysa uyarı yok", () => {
    const logs = [d(-1), d(-2), d(-3)].map((x) => log(x, { sleepAt: "23:00", wakeAt: "07:00" }));
    const tasks = [task("a", d(-1), true), task("b", d(-2), true), task("c", d(-3), true)];
    expect(computeAlerts({ today, tasks, results: [], logs })).toEqual([]);
  });

  it(`form ${ALERT_THRESHOLDS.formMissingDays}+ gün boş`, () => {
    const logs = [log(d(-3))];
    const a = computeAlerts({ today, tasks: [], results: [], logs });
    expect(kinds(a)).toContain("form-missing");
    expect(a.find((x) => x.kind === "form-missing")!.text).toContain("2 gün");
    // Bugün boş olması sayılmaz; yalnızca dün boşsa tetiklenmez.
    expect(kinds(computeAlerts({ today, tasks: [], results: [], logs: [log(d(-2))] }))).not.toContain("form-missing");
  });

  it("öğrenci yeni bağlandıysa öncesi sayılmaz", () => {
    expect(kinds(computeAlerts({ today, tasks: [], results: [], logs: [], since: d(-1) }))).not.toContain("form-missing");
  });

  it("tamamlanma 3 gün üst üste %50 altı (görevsiz gün atlanır)", () => {
    const tasks = [
      task("a", d(-1), false), task("a2", d(-1), true), task("a3", d(-1), false),
      task("b", d(-2), false),
      task("c", d(-4), false),
    ];
    expect(kinds(computeAlerts({ today, tasks, results: [], logs: [] }))).toContain("low-completion");
    const better = [...tasks, task("b2", d(-2), true), task("b3", d(-2), true)];
    expect(kinds(computeAlerts({ today, tasks: better, results: [], logs: [] }))).not.toContain("low-completion");
  });

  it("son 3 gecenin ortalaması 6 saatin altında", () => {
    const short = [d(0), d(-1), d(-2)].map((x) => log(x, { sleepAt: "01:00", wakeAt: "06:30" }));
    expect(kinds(computeAlerts({ today, tasks: [], results: [], logs: short }))).toContain("low-sleep");
    const two = short.slice(0, 2);
    expect(kinds(computeAlerts({ today, tasks: [], results: [], logs: two }))).not.toContain("low-sleep");
  });

  it("aynı görev (aynı başlık) 2 kez yapılmadı", () => {
    const tasks = [task("x1", d(-2), false, "Rutin | Paragraf"), task("x2", d(-1), false, "rutin | paragraf")];
    const a = computeAlerts({ today, tasks, results: [skipped("x1", d(-2)), skipped("x2", d(-1))], logs: [] });
    expect(a.find((x) => x.kind === "repeat-skip")?.text).toContain("2 kez");
    expect(kinds(computeAlerts({ today, tasks, results: [skipped("x1", d(-2))], logs: [] }))).not.toContain("repeat-skip");
  });
});
