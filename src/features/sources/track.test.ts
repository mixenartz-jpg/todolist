import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { SourceProgress } from "./progress";
import type { SourceStatus } from "./types";
import { summarize, type UnitColor, type UnitState } from "./unitStatus";
import { trackSource, trackSources } from "./track";

const today = asDateStr("2026-11-22");

function st(number: number, color: UnitColor, date: string | null): UnitState {
  return { number, color, reason: "none", manual: false, task: null, result: null, date: date ? asDateStr(date) : null, note: null } as UnitState;
}

function prog(id: string, subject: string | null, status: SourceStatus, states: UnitState[]): SourceProgress {
  const summary = summarize(states);
  return {
    source: {
      id, title: id, subject, exam: "AYT", kind: "kitap", publisher: null, level: null, unit: "test", minutesPerUnit: null,
      status, totalTests: 0, studentId: null, aliases: [], sortOrder: 0, archivedAt: null, series: [],
    },
    series: [{ series: {} as never, summary, sections: [{ section: {} as never, states, summary, tasks: [] }] }],
    summary,
    hasLinks: false,
  };
}

describe("trackSource", () => {
  it("kalan, son 14 gün, son çalışma, tahmini bitiş", () => {
    const p = prog("a", "Fizik", "devam", [
      st(1, "green", "2026-11-01"), // pencere dışı
      st(2, "green", "2026-11-15"),
      st(3, "green", "2026-11-20"),
      st(4, "yellow", "2026-11-23"),
      ...Array.from({ length: 6 }, (_, i) => st(5 + i, "gray", null)),
    ]);
    const t = trackSource(p, today);
    expect(t.remaining).toBe(7);
    expect(t.recent).toBe(2);
    expect(t.lastDate).toBe("2026-11-20");
    // 2 birim / 14 gün → 7 birim 49 gün
    expect(t.etaDays).toBe(49);
  });

  it("tempo yoksa tahmin yok", () => {
    const t = trackSource(prog("a", "Fizik", "sirada", [st(1, "gray", null)]), today);
    expect(t.etaDays).toBeNull();
    expect(t.lastDate).toBeNull();
  });
});

describe("trackSources", () => {
  it("derse göre gruplar, Diğer sonda, Devam önce", () => {
    const groups = trackSources(
      [
        prog("x", null, "devam", [st(1, "gray", null)]),
        prog("b", "Fizik", "bitti", [st(1, "green", "2026-11-21")]),
        prog("a", "Fizik", "devam", [st(1, "gray", null)]),
        prog("m", "Matematik", "sirada", [st(1, "gray", null)]),
      ],
      today,
    );
    expect(groups.map((g) => g.subject)).toEqual(["Fizik", "Matematik", "Diğer"]);
    expect(groups[0].rows.map((r) => r.p.source.id)).toEqual(["a", "b"]);
    expect(groups[0].summary).toMatchObject({ total: 2, green: 1 });
  });
});
