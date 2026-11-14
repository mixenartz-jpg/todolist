import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { Task } from "@/features/tasks/types";
import { DOT_EMPTY, dayDot, stripFor } from "./days";

const today = asDateStr("2026-11-14");
const t = (due: string, done: boolean): Task => ({
  id: due + done + Math.random(), title: "x", dueDate: asDateStr(due), done, note: null, sortOrder: 0,
  completedAt: null, categoryId: null, goalId: null, nodeId: null, colorSlot: null, estimateMinutes: null,
});

describe("stripFor", () => {
  it("öğrenci: bugüne sabit 22 gün", () => {
    const s = stripFor("student", today, today);
    expect(s).toHaveLength(22);
    expect(s[0]).toBe("2026-10-31");
  });
  it("öğrenci şerit dışı güne geldiyse o gün eklenir", () => {
    expect(stripFor("preview", asDateStr("2026-09-01"), today)[0]).toBe("2026-09-01");
  });
  it("koç: seçili günün etrafında kayar (uzak gelecek dahil)", () => {
    const s = stripFor("coach", asDateStr("2027-01-10"), today);
    expect(s).toHaveLength(29);
    expect(s[14]).toBe("2027-01-10");
  });
});

describe("dayDot", () => {
  it("yeşil ≥%70, sarı, kırmızı, gri", () => {
    const d = "2026-11-13";
    expect(dayDot(asDateStr(d), today, [t(d, true), t(d, true), t(d, true), t(d, false)])).toBe("var(--color-good)");
    expect(dayDot(asDateStr(d), today, [t(d, true), t(d, false)])).toBe("var(--color-warn)");
    expect(dayDot(asDateStr(d), today, [t(d, false), t(d, false), t(d, true)])).toBe("var(--color-danger)");
    expect(dayDot(asDateStr(d), today, [])).toBe(DOT_EMPTY);
    expect(dayDot(asDateStr("2026-11-15"), today, [t("2026-11-15", true)])).toBe(DOT_EMPTY);
  });
});
