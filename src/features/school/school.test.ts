import { describe, expect, it } from "vitest";
import type { Topic } from "@/features/sources/types";
import type { TopicStats, TopicStatus } from "@/features/topics/stats";
import { filterTopics, parseTopicFilter, schoolGap, schoolSummary, type SchoolMark } from "./school";

const topic = (id: string): Topic => ({ id, subject: "Fizik", exam: "AYT", name: id, aliases: [], sortOrder: 0 });
const stat = (id: string, status: TopicStatus): TopicStats => ({
  topic: topic(id), solved: 0, total: 0, correct: 0, wrong: 0, accuracy: null, recentAccuracy: null,
  sources: [], video: null, lastDate: null, status, taskCount: 0,
});
const mark = (topicId: string, status: SchoolMark["status"]): SchoolMark => ({ topicId, status, coveredOn: null });

describe("schoolGap", () => {
  it("okulda işlendi, öğrenci başlamadı → geride", () => {
    expect(schoolGap(stat("a", "none"), mark("a", "done"))).toBe("behind");
    expect(schoolGap(stat("a", "weak"), mark("a", "current"))).toBe("behind");
  });
  it("okulda işlendi, öğrenci çalışıyor → uyumlu", () => {
    expect(schoolGap(stat("a", "good"), mark("a", "done"))).toBe("ok");
    expect(schoolGap(stat("a", "working"), mark("a", "current"))).toBe("ok");
  });
  it("okul işlemedi, öğrenci çalışıyor → önde", () => {
    expect(schoolGap(stat("a", "working"), undefined)).toBe("ahead");
    expect(schoolGap(stat("a", "none"), undefined)).toBe("ok");
  });
});

describe("schoolSummary + filterTopics", () => {
  const stats = [stat("a", "none"), stat("b", "good"), stat("c", "weak"), stat("d", "none")];
  const marks = new Map([
    ["a", mark("a", "done")],
    ["b", mark("b", "done")],
    ["c", mark("c", "current")],
  ]);

  it("özet: işlenen, şu an, geride", () => {
    const s = schoolSummary(stats, marks);
    expect(s).toMatchObject({ total: 4, done: 2, behind: 2 });
    expect(s.current.map((t) => t.id)).toEqual(["c"]);
  });

  it("süzgeçler", () => {
    expect(filterTopics(stats, marks, "behind").map((s) => s.topic.id)).toEqual(["a", "c"]);
    expect(filterTopics(stats, marks, "weak").map((s) => s.topic.id)).toEqual(["c"]);
    expect(filterTopics(stats, marks, "none").map((s) => s.topic.id)).toEqual(["a", "d"]);
    expect(filterTopics(stats, marks, "all")).toHaveLength(4);
  });

  it("bilinmeyen süzgeç → tümü", () => {
    expect(parseTopicFilter("xyz")).toBe("all");
    expect(parseTopicFilter(null)).toBe("all");
    expect(parseTopicFilter("behind")).toBe("behind");
  });
});
