import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { DailyLog, TaskResult } from "@/features/results/types";
import type { Task } from "@/features/tasks/types";
import { attention, doneTodayElsewhere, todayBoard, weekSummary } from "./coachSummary";

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

describe("Panel Bugün kartı", () => {
  it("her görevin durumu ve tek satır özeti", () => {
    const tasks = [
      task("a", "2026-11-12", true, 60),
      task("b", "2026-11-12", false, 60),
      task("c", "2026-11-12", false, 60),
      task("d", "2026-11-12", true, 30), // koç işaretledi, sonuç yok
      task("e", "2026-11-12", false, 30),
    ];
    const results = [
      result("a", "2026-11-12", { status: "done", correct: 15, wrong: 2, actualMinutes: 132 }),
      result("b", "2026-11-12", { status: "partial" }),
      result("c", "2026-11-12", { status: "skipped" }),
      result("e", "2026-11-11", { status: "done" }), // başka günün sonucu sayılmaz
    ];
    const rows = todayBoard(today, tasks, results);
    expect(rows.map((r) => r.state)).toEqual(["done", "partial", "skipped", "done", "pending"]);
    expect(rows[0].summary).toBe("15D 2Y · 14.5 net · 2.2 sa");
    expect(rows[4].summary).toBe("");
  });

  it("bugün erken yapılan başka günlerin görevleri ayrı listelenir", () => {
    const tasks = [task("x", "2026-11-13", true, 60), task("y", "2026-11-14", false, 60), task("z", "2026-11-12", true, 60)];
    const doneToday = [
      result("y", "2026-11-14", { status: "partial", doneOn: today }),
      result("x", "2026-11-13", { status: "done", doneOn: today }),
      result("z", "2026-11-12", { status: "done", doneOn: today }), // bugünün kendi görevi
      result("silinmis", "2026-11-15", { status: "done", doneOn: today }),
    ];
    const rows = doneTodayElsewhere(today, tasks, doneToday);
    expect(rows.map((r) => [r.task.id, r.plannedFor, r.state])).toEqual([
      ["x", "2026-11-13", "done"],
      ["y", "2026-11-14", "partial"],
    ]);
  });
});
