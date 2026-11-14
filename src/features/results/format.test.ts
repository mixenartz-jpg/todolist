import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { SLEEP_OPTIONS, STUDY_BUCKETS, WAKE_OPTIONS, timeOptions } from "./buckets";
import {
  completionTone,
  formatMinutesShort,
  hasResultContent,
  isLogFilled,
  resultNet,
  resultSummary,
  sleepMinutes,
} from "./format";
import type { DailyLog, TaskResult } from "./types";

function result(over: Partial<TaskResult> = {}): TaskResult {
  return {
    taskId: "t",
    date: asDateStr("2026-11-14"),
    studentId: "s",
    status: null,
    total: null,
    correct: null,
    wrong: null,
    empty: null,
    actualMinutes: null,
    missingTopics: [],
    reason: null,
    note: null,
    updatedAt: "",
    ...over,
  };
}

describe("net", () => {
  it("D − Y/4", () => {
    expect(resultNet({ correct: 23, wrong: 3 })).toBe(22.25);
    expect(resultNet({ correct: 10, wrong: null })).toBe(10);
    expect(resultNet({ correct: null, wrong: 3 })).toBeNull();
  });
});

describe("resultSummary", () => {
  it("örnekteki satırı üretir", () => {
    expect(resultSummary(result({ correct: 23, wrong: 3, actualMinutes: 150 }))).toBe(
      "23D 3Y · 22.25 net · 2.5 sa",
    );
  });
  it("boş bırakılanları atlar", () => {
    expect(resultSummary(result({ actualMinutes: 45 }))).toBe("45 dk");
    expect(resultSummary(result())).toBe("");
    expect(resultSummary(result({ correct: 5, wrong: 0, empty: 2 }))).toBe("5D 0Y 2B · 5 net");
  });
});

describe("hasResultContent", () => {
  it("tamamen boş sonuç içeriksizdir", () => {
    expect(hasResultContent(result())).toBe(false);
    expect(hasResultContent(result({ status: "skipped" }))).toBe(true);
    expect(hasResultContent(result({ missingTopics: ["Üslü"] }))).toBe(true);
  });
});

describe("formatMinutesShort", () => {
  it("saat ve dakika", () => {
    expect(formatMinutesShort(30)).toBe("30 dk");
    expect(formatMinutesShort(60)).toBe("1 sa");
    expect(formatMinutesShort(90)).toBe("1.5 sa");
  });
});

describe("completionTone", () => {
  it("eşikler", () => {
    expect(completionTone(0)).toBe("low");
    expect(completionTone(0.39)).toBe("low");
    expect(completionTone(0.41)).toBe("mid");
    expect(completionTone(0.7)).toBe("high");
    expect(completionTone(1)).toBe("high");
  });
});

describe("sleepMinutes", () => {
  it("gece yarısını aşar", () => {
    expect(sleepMinutes({ sleepAt: "23:30", wakeAt: "07:15" })).toBe(465);
    expect(sleepMinutes({ sleepAt: "01:00", wakeAt: "09:00" })).toBe(480);
    expect(sleepMinutes({ sleepAt: null, wakeAt: "09:00" })).toBeNull();
  });
});

describe("isLogFilled", () => {
  const empty: DailyLog = {
    studentId: "s",
    date: asDateStr("2026-11-14"),
    sleepAt: null,
    wakeAt: null,
    studyBucket: null,
    screenBucket: null,
    energy: null,
    note: "  ",
    updatedAt: "",
  };
  it("yalnızca boşluk notu dolu sayılmaz", () => {
    expect(isLogFilled(undefined)).toBe(false);
    expect(isLogFilled(empty)).toBe(false);
    expect(isLogFilled({ ...empty, studyBucket: 0 })).toBe(true);
  });
});

describe("seçenekler", () => {
  it("15 dk adım, gece yarısı sarar", () => {
    expect(timeOptions(23, 1)).toEqual(["23:00", "23:15", "23:30", "23:45"]);
    expect(SLEEP_OPTIONS).toContain("23:30");
    expect(SLEEP_OPTIONS).toContain("00:15");
    expect(WAKE_OPTIONS[0]).toBe("04:00");
    expect(STUDY_BUCKETS[0]).toBe("0–1 sa");
    expect(STUDY_BUCKETS.at(-1)).toBe("10+ sa");
  });
});
