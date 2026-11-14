import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { chipLabel, dayMode, headline, isEditableDay, stripDays } from "./days";
import { addTopics, looksLikeQuestionTask, topicKey } from "./topics";

const today = asDateStr("2026-11-14");

describe("gün şeridi", () => {
  it("14 geri + bugün + 7 ileri", () => {
    const days = stripDays(today);
    expect(days).toHaveLength(22);
    expect(days[14]).toBe(today);
    expect(days[0]).toBe("2026-10-31");
  });
  it("çip ve başlık metni", () => {
    expect(chipLabel(asDateStr("2026-11-03"))).toBe("3 Kas Sal");
    expect(headline(today)).toBe("14 Kasım Cumartesi");
  });
  it("kip ve düzenlenebilirlik", () => {
    expect(dayMode(asDateStr("2026-11-13"), today)).toBe("past");
    expect(dayMode(today, today)).toBe("today");
    expect(dayMode(asDateStr("2026-11-15"), today)).toBe("future");
    expect(isEditableDay(asDateStr("2026-11-13"), today, false)).toBe(true);
    expect(isEditableDay(asDateStr("2026-11-15"), today, false)).toBe(false);
    expect(isEditableDay(today, today, true)).toBe(false);
  });
});

describe("eksik konular", () => {
  it("virgülle böler, tekrarı atar, Türkçe duyarsız", () => {
    expect(addTopics(["Üslü Sayılar"], "üslü sayılar, Köklü  Sayılar,, ")).toEqual([
      "Üslü Sayılar",
      "Köklü Sayılar",
    ]);
    expect(topicKey(" İntegral ")).toBe(topicKey("integral"));
  });
});

describe("soru görevi sezgisi", () => {
  it("ekran görüntüsündeki başlıklar", () => {
    expect(looksLikeQuestionTask("Kafadengi Mat | Üslü Sayılar | 26-33 Arası Çöz + Analiz")).toBe(true);
    expect(looksLikeQuestionTask("Rutin | Paragraf Çözümü")).toBe(true);
    expect(looksLikeQuestionTask("X Akademi AYT Fizik Kursu | 12 - Basit Harmonik Hareket | İzle")).toBe(false);
  });
});

import { dayRecords } from "./history";
import type { Task } from "@/features/tasks/types";

describe("dayRecords", () => {
  const task = (id: string, due: string, done: boolean): Task => ({
    id,
    title: id,
    dueDate: asDateStr(due),
    done,
    note: null,
    sortOrder: 0,
    completedAt: null,
    categoryId: null,
    goalId: null,
    nodeId: null,
    colorSlot: null,
    estimateMinutes: null,
  });

  it("boş günleri atlar, yeniden eskiye sıralar", () => {
    const recs = dayRecords(
      [task("a", "2026-11-13", true), task("b", "2026-11-13", false), task("c", "2026-11-11", false)],
      [
        {
          taskId: "b",
          date: asDateStr("2026-11-13"),
          studentId: "s",
          status: "skipped",
          total: null,
          correct: null,
          wrong: null,
          empty: null,
          actualMinutes: null,
          missingTopics: [],
          reason: "yorgundum",
          note: null,
          updatedAt: "",
        },
      ],
      [],
      [],
      asDateStr("2026-11-10"),
      asDateStr("2026-11-14"),
    );
    expect(recs.map((r) => r.date)).toEqual(["2026-11-13", "2026-11-11"]);
    expect(recs[0]).toMatchObject({ total: 2, done: 1, missed: 1, formFilled: false });
  });
});
