import { describe, expect, it } from "vitest";
import { asDateStr, eachDay } from "@/lib/date/date";
import { defaultCollapsed, splitWeeks } from "./foldrule";
import type { WeekSummary } from "./weekmap";

const d = asDateStr;

describe("defaultCollapsed", () => {
  // 21–27 Eylül 2026 (Pzt–Paz)
  const week = eachDay(d("2026-09-21"), d("2026-09-27"));

  it("geçmiş günler kapalı, bugün ve yarın açık, sonrası kapalı", () => {
    const today = d("2026-09-23");
    const open = week.filter((x) => !defaultCollapsed(x, today, week));
    expect(open).toEqual([d("2026-09-23"), d("2026-09-24")]);
  });

  it("bugün haftanın son günüyse yalnızca bugün açık", () => {
    const today = d("2026-09-27");
    const open = week.filter((x) => !defaultCollapsed(x, today, week));
    expect(open).toEqual([today]);
  });

  it("tamamen ileride bir haftada yalnızca ilk gün açık", () => {
    const today = d("2026-09-15");
    const open = week.filter((x) => !defaultCollapsed(x, today, week));
    expect(open).toEqual([d("2026-09-21")]);
  });

  it("tamamen geçmiş bir haftada her gün kapalı", () => {
    const today = d("2026-10-05");
    expect(week.every((x) => defaultCollapsed(x, today, week))).toBe(true);
  });
});

function hafta(start: string, end: string, today: string): WeekSummary {
  return {
    weekStart: d(start),
    weekEnd: d(end),
    openCount: 0,
    doneCount: 0,
    inScope: true,
    hasToday: start <= today && today <= end,
  };
}

describe("splitWeeks", () => {
  const starts: [string, string][] = [
    ["2026-08-31", "2026-09-06"],
    ["2026-09-07", "2026-09-13"],
    ["2026-09-14", "2026-09-20"],
    ["2026-09-21", "2026-09-27"],
    ["2026-09-28", "2026-10-04"],
  ];

  it("geçmiş / bu hafta + sonraki / geri kalan", () => {
    const today = "2026-09-16";
    const r = splitWeeks(
      starts.map(([s, e]) => hafta(s, e, today)),
      d(today),
    );
    expect(r.past.map((h) => h.weekStart)).toEqual([d("2026-08-31"), d("2026-09-07")]);
    expect(r.visible.map((h) => h.weekStart)).toEqual([d("2026-09-14"), d("2026-09-21")]);
    expect(r.later.map((h) => h.weekStart)).toEqual([d("2026-09-28")]);
  });

  it("ileride bir ayda yalnızca ilk hafta görünür", () => {
    const today = "2026-08-10";
    const r = splitWeeks(
      starts.map(([s, e]) => hafta(s, e, today)),
      d(today),
    );
    expect(r.past).toEqual([]);
    expect(r.visible.map((h) => h.weekStart)).toEqual([d("2026-08-31")]);
    expect(r.later).toHaveLength(4);
  });

  it("geçmiş bir ayda hiçbir hafta görünmez", () => {
    const today = "2026-11-10";
    const r = splitWeeks(
      starts.map(([s, e]) => hafta(s, e, today)),
      d(today),
    );
    expect(r.past).toHaveLength(5);
    expect(r.visible).toEqual([]);
  });
});
