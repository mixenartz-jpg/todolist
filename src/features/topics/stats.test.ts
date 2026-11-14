import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { TaskResult } from "@/features/results/types";
import { indexProgress, sourceProgress } from "@/features/sources/progress";
import type { SourceTree, Topic } from "@/features/sources/types";
import type { Task } from "@/features/tasks/types";
import { topicStats } from "./stats";

const T = (id: string, name: string, subject = "Fizik", exam: Topic["exam"] = "AYT"): Topic => ({
  id, subject, exam, name, aliases: [], sortOrder: 0,
});
const topics = [T("bhh", "Basit Harmonik Hareket"), T("dalga", "Dalga Mekaniği"), T("atom", "Atom Fiziği"), T("uslu", "Üslü", "Matematik", "TYT")];

function task(id: string, due: string, extra: Partial<Task> = {}): Task {
  return {
    id, title: id, dueDate: asDateStr(due), done: false, note: null, sortOrder: 0, completedAt: null,
    categoryId: null, goalId: null, nodeId: null, colorSlot: null, estimateMinutes: null, ...extra,
  };
}
function result(taskId: string, date: string, o: Partial<TaskResult>): TaskResult {
  return {
    taskId, date: asDateStr(date), studentId: "s", status: "done", total: null, correct: null, wrong: null, empty: null,
    actualMinutes: null, missingTopics: [], reason: null, note: null, doneOn: null, updatedAt: "", ...o,
  };
}

const book: SourceTree = {
  id: "bs", title: "BilgiSarmal", subject: "Fizik", exam: "AYT", kind: "kitap", publisher: null, level: null, unit: "test",
  minutesPerUnit: 20, status: "devam", totalTests: 0, studentId: null, aliases: [], sortOrder: 0, archivedAt: null,
  series: [{ id: "k", sourceId: "bs", name: "Konu Testleri", kind: "konu", sortOrder: 0, sections: [
    { id: "s-bhh", seriesId: "k", topicId: "bhh", label: "BHH", unitFrom: 1, unitTo: 4, sortOrder: 0,
      items: [1, 2, 3, 4].map((n) => ({ id: `b${n}`, sectionId: "s-bhh", number: n, topicId: null })) },
    { id: "s-dalga", seriesId: "k", topicId: "dalga", label: "Dalga", unitFrom: 5, unitTo: 6, sortOrder: 1,
      items: [5, 6].map((n) => ({ id: `b${n}`, sectionId: "s-dalga", number: n, topicId: n === 6 ? "bhh" : null })) },
  ] }],
};
const video: SourceTree = {
  ...book, id: "v", title: "X Akademi", kind: "video", unit: "ders",
  series: [{ id: "d", sourceId: "v", name: "Dersler", kind: "konu", sortOrder: 0, sections: [
    { id: "v-bhh", seriesId: "d", topicId: "bhh", label: "BHH", unitFrom: 12, unitTo: 14, sortOrder: 0, items: [] },
  ] }],
};

describe("konu takibi", () => {
  const tasks = [
    task("a", "2026-11-10"),
    task("b", "2026-11-12"),
    task("c", "2026-11-13"),
    task("w", "2026-11-11", { sectionId: "v-bhh", rangeFrom: 12, rangeTo: 13 }),
  ];
  const results = [
    result("a", "2026-11-10", { correct: 10, wrong: 10 }),
    result("b", "2026-11-12", { correct: 9, wrong: 1 }),
    result("c", "2026-11-13", { correct: 8, wrong: 0 }),
    result("w", "2026-11-11", { understanding: 3 }),
  ];
  const ixr = indexProgress({
    tasks,
    taskItems: [
      { taskId: "a", itemId: "b1" }, { taskId: "a", itemId: "b2" }, { taskId: "b", itemId: "b3" }, { taskId: "c", itemId: "b6" },
    ],
    results,
    itemMarks: [{ itemId: "b5", status: "done", markedAt: "2026-11-14T08:00:00Z", note: null }],
  });
  const stats = topicStats(topics, [sourceProgress(book, ixr), sourceProgress(video, ixr)], ixr, results, {
    subject: "Fizik",
    exam: "AYT",
  });
  const by = new Map(stats.map((s) => [s.topic.id, s]));

  it("ders/sınav kapsamı", () => {
    expect(stats.map((s) => s.topic.id)).toEqual(["bhh", "dalga", "atom"]);
  });

  it("çözülen birim (test konusu bölümün önüne geçer), kaynak dağılımı, video", () => {
    const bhh = by.get("bhh")!;
    expect(bhh.solved).toBe(4); // b1, b2, b3, b6
    expect(bhh.total).toBe(5);
    expect(bhh.video).toEqual({ watched: 2, total: 3 });
    expect(bhh.sources.map((s) => [s.title, s.green, s.total])).toEqual([
      ["BilgiSarmal", 4, 5],
      ["X Akademi", 2, 3],
    ]);
  });

  it("doğruluk ve durum: son 2 sonuç ≥ %80 → iyi", () => {
    const bhh = by.get("bhh")!;
    expect(bhh.accuracy).toBeCloseTo(27 / 38);
    expect(bhh.recentAccuracy).toBeCloseTo(17 / 18);
    expect(bhh.status).toBe("good");
    expect(bhh.lastDate).toBe("2026-11-13");
  });

  it("yalnızca elle işaret → çalışılıyor; hiçbir şey → başlanmadı", () => {
    expect(by.get("dalga")!.status).toBe("working");
    expect(by.get("dalga")!.lastDate).toBe("2026-11-14");
    expect(by.get("atom")!.status).toBe("none");
  });

  it("zayıf: son 2 sonuç < %60", () => {
    const weak = topicStats(topics, [sourceProgress(book, ixr)], ixr, [
      result("a", "2026-11-10", { correct: 2, wrong: 8 }),
      result("b", "2026-11-12", { correct: 3, wrong: 7 }),
    ], { subject: "Fizik", exam: null });
    expect(weak.find((s) => s.topic.id === "bhh")!.status).toBe("weak");
  });
});
