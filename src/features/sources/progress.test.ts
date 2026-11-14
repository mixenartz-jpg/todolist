import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { TaskResult } from "@/features/results/types";
import type { Task } from "@/features/tasks/types";
import { indexProgress, sourceProgress } from "./progress";
import type { SourceTree } from "./types";

function task(id: string, due: string, extra: Partial<Task> = {}): Task {
  return {
    id, title: id, dueDate: asDateStr(due), done: false, note: null, sortOrder: 0, completedAt: null,
    categoryId: null, goalId: null, nodeId: null, colorSlot: null, estimateMinutes: null, ...extra,
  };
}
function result(taskId: string, date: string, o: Partial<TaskResult>): TaskResult {
  return {
    taskId, date: asDateStr(date), studentId: "s", status: null, total: null, correct: null, wrong: null,
    empty: null, actualMinutes: null, missingTopics: [], reason: null, note: null, doneOn: null, updatedAt: "", ...o,
  };
}
function tree(unit: SourceTree["unit"], sections: Array<[string, number, number]>): SourceTree {
  return {
    id: "src", title: "BilgiSarmal", subject: "Fizik", exam: "AYT", kind: "kitap", publisher: null, level: null,
    unit, minutesPerUnit: 20, status: "sirada", totalTests: 0, studentId: "s", aliases: [], sortOrder: 0, archivedAt: null,
    series: [{
      id: "se", sourceId: "src", name: "Konu Testleri", kind: "konu", sortOrder: 0,
      sections: sections.map(([id, from, to], i) => ({
        id, seriesId: "se", topicId: null, label: id, unitFrom: from, unitTo: to, sortOrder: i,
        items: unit === "test" ? Array.from({ length: to - from + 1 }, (_, k) => ({ id: `${id}-${from + k}`, sectionId: id, number: from + k, topicId: null })) : [],
      })),
    }],
  };
}

describe("sourceProgress", () => {
  it("test kaynağı: task_items + yarım görevde done_items; seriler arası toplam", () => {
    const t = tree("test", [["bhh", 39, 42], ["dalga", 43, 44]]);
    const a = task("a", "2026-11-10");
    const b = task("b", "2026-11-12");
    const ix = indexProgress({
      tasks: [a, b],
      taskItems: [
        { taskId: "a", itemId: "bhh-39" }, { taskId: "a", itemId: "bhh-40" }, { taskId: "a", itemId: "bhh-41" },
        { taskId: "b", itemId: "dalga-43" },
      ],
      results: [
        result("a", "2026-11-09", { status: "skipped" }), // eski gün — ana sonuç kendi günü
        result("a", "2026-11-10", { status: "partial", doneItems: ["bhh-39", "bhh-41"] }),
      ],
    });
    const p = sourceProgress(t, ix);
    expect(p.series[0].sections[0].states.map((s) => s.color)).toEqual(["green", "red", "green", "gray"]);
    expect(p.series[0].sections[1].states.map((s) => s.color)).toEqual(["yellow", "gray"]);
    expect(p.summary).toEqual({ total: 6, green: 2, yellow: 1, red: 1, gray: 2 });
    expect(p.hasLinks).toBe(true);
  });

  it("sayfa kaynağı: section_id + aralık, İlerlet reached_to, elle aralık işareti", () => {
    const t = tree("sayfa", [["s1", 120, 135]]);
    const ilerlet = task("i", "2026-11-12", { sectionId: "s1", rangeFrom: 126, rangeTo: 135, targetAmount: 10 });
    const ix = indexProgress({
      tasks: [ilerlet, task("baska", "2026-11-12", { sectionId: "baska", rangeFrom: 1, rangeTo: 5 })],
      taskItems: [],
      results: [result("i", "2026-11-12", { status: "done", reachedTo: 133 })],
      rangeMarks: [{ sectionId: "s1", from: 120, to: 125, status: "done", markedAt: "2026-11-01T00:00:00Z", note: null }],
    });
    const s = sourceProgress(t, ix).series[0].sections[0];
    expect(s.summary).toEqual({ total: 16, green: 14, yellow: 0, red: 2, gray: 0 });
    expect(s.tasks.map((x) => x.id)).toEqual(["i"]);
  });
});
