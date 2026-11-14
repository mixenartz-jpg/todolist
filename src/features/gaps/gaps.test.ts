import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { sortGaps, type GapItem } from "./queries";

const g = (id: string, status: GapItem["status"], count: number, last = "2026-11-10"): GapItem => ({
  id, topic: id, subject: null, firstSeen: asDateStr("2026-11-01"), lastSeen: asDateStr(last),
  count, status, taskId: null,
});

describe("sortGaps", () => {
  it("açık > planlı > kapalı, sonra sıklık", () => {
    const sorted = sortGaps([g("c", "closed", 9), g("p", "planned", 5), g("o1", "open", 1), g("o2", "open", 3)]);
    expect(sorted.map((x) => x.id)).toEqual(["o2", "o1", "p", "c"]);
  });
});
