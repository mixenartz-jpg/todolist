import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { DailyLog, TaskResult } from "@/features/results/types";
import type { Task } from "@/features/tasks/types";
import { attention, weekSummary } from "./coachSummary";

const today = asDateStr("2026-11-12"); // Perşembe

function task(id: string, due: string, done: boolean, est: number | null): Task {
  return {
    id, title: id, dueDate: asDateStr(due), done, note: null, sortOrder: 0, completedAt: null,
    categoryId: null, goalId: null, nodeId: null, colorSlot: null, estimateMinutes: est,
  };
}
function result(taskId: string, date: string, o: Partial<TaskResult>): TaskResult {
  return {
    taskId, date: asDateStr(date), studentId: "s", status: null, total: null, correct: null,
    wrong: null, empty: null, actualMinutes: null, missingTopics: [], reason: null, note: null, doneOn: null,
    updatedAt: "", ...o,
  };
}
function log(date: string, o: Partial<DailyLog>): DailyLog {
  return {
    studentId: "s", date: asDateStr(date), sleepAt: null, wakeAt: null, studyBucket: null,
    screenBucket: null, energy: null, note: null, updatedAt: "", ...o,
  };
}

describe("weekSummary", () => {
  const tasks = [
    task("a", "2026-11-09", true, 120),
    task("b", "2026-11-10", false, 60),
    task("c", "2026-11-14", false, 600), // gelecek: plana sayılmaz
  ];
  const results = [result("a", "2026-11-09", { actualMinutes: 90 })];
  const logs = [
    log("2026-11-10", { studyBucket: 2, sleepAt: "23:00", wakeAt: "07:00" }),
    log("2026-11-11", { sleepAt: "00:00", wakeAt: "06:00" }),
  ];

  it("hafta Pzt–Paz, plan–gerçek bugüne kadar", () => {
    const w = weekSummary(today, tasks, results, logs);
    expect(w.days).toHaveLength(7);
    expect(w.days[0].date).toBe("2026-11-09");
    expect(w.plannedMinutes).toBe(180);
    expect(w.actualMinutes).toBe(90);
    expect(w.adherence).toBeCloseTo(0.5);
  });

  it("çalışma: gerçek süre, yoksa form kovası", () => {
    const w = weekSummary(today, tasks, results, logs);
    expect(w.days[0].studyMinutes).toBe(90);
    expect(w.days[1].studyMinutes).toBe(150); // 2–3 sa → 2.5 sa
    expect(w.totalStudyMinutes).toBe(240);
  });

  it("ortalama uyku", () => {
    expect(weekSummary(today, tasks, results, logs).avgSleepMinutes).toBe(420);
    expect(weekSummary(today, tasks, results, []).avgSleepMinutes).toBeNull();
  });

  it("plan yoksa uyum null", () => {
    expect(weekSummary(today, [], [], []).adherence).toBeNull();
  });
});

describe("attention", () => {
  it("son 7 günün kaçanları ve en sık eksik konular", () => {
    const tasks = [task("a", "2026-11-11", false, null), task("b", "2026-11-10", false, null)];
    const results = [
      result("a", "2026-11-11", { status: "skipped", reason: "yorgun", missingTopics: ["Üslü Sayılar"] }),
      result("b", "2026-11-10", { status: "partial", missingTopics: ["üslü sayılar", "Köklü"] }),
      result("b", "2026-11-01", { status: "skipped", missingTopics: ["Eski"] }),
    ];
    const { missed, topics } = attention(today, tasks, results);
    expect(missed.map((m) => m.taskId)).toEqual(["a", "b"]);
    expect(topics).toEqual([
      { topic: "Üslü Sayılar", count: 2 },
      { topic: "Köklü", count: 1 },
    ]);
  });
});
