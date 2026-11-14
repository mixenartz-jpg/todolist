import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { IsoWeekday } from "@/lib/date/types";
import { distribute } from "./distribute";
import { plansFromRows, seriesSlice, sourceHasTopic, topicSlice } from "./distributePlan";
import { indexProgress, sourceProgress } from "./progress";
import type { SourceTree, Topic } from "./types";

const topics = new Map<string, Topic>([
  ["uslu", { id: "uslu", subject: "Matematik", exam: "TYT", name: "Üslü Sayılar", aliases: [], sortOrder: 0 }],
  ["koklu", { id: "koklu", subject: "Matematik", exam: "TYT", name: "Köklü Sayılar", aliases: [], sortOrder: 1 }],
]);

function book(id: string, title: string, sections: Array<[string, string | null, number, number]>, osym?: Record<number, string>): SourceTree {
  return {
    id, title, subject: "Matematik", exam: "TYT", kind: "kitap", publisher: null, level: null, unit: "test",
    minutesPerUnit: 15, status: "devam", totalTests: 0, studentId: null, aliases: [], sortOrder: 0, archivedAt: null,
    series: [
      { id: `${id}-konu`, sourceId: id, name: "Konu Testleri", kind: "konu", sortOrder: 0, sections: sections.map(([sid, topic, a, b], i) => ({
        id: sid, seriesId: `${id}-konu`, topicId: topic, label: sid, unitFrom: a, unitTo: b, sortOrder: i,
        items: Array.from({ length: b - a + 1 }, (_, k) => ({ id: `${sid}-${a + k}`, sectionId: sid, number: a + k, topicId: null })),
      })) },
      ...(osym ? [{ id: `${id}-osym`, sourceId: id, name: "ÖSYM Tipi", kind: "osym" as const, sortOrder: 1, sections: [{
        id: `${id}-o`, seriesId: `${id}-osym`, topicId: null, label: "ÖSYM Tipi", unitFrom: 1, unitTo: 3, sortOrder: 0,
        items: [1, 2, 3].map((n) => ({ id: `${id}-o-${n}`, sectionId: `${id}-o`, number: n, topicId: osym[n] ?? null })),
      }] }] : []),
    ],
  };
}

const kd = book("kd", "Kafadengi", [["kd-uslu", "uslu", 46, 53], ["kd-koklu", "koklu", 54, 66]], { 2: "uslu" });
const hiz = book("hiz", "Hız", [["hiz-uslu", "uslu", 51, 60]]);
const ix = indexProgress({ tasks: [], taskItems: [], results: [] });
const pkd = sourceProgress(kd, ix);
const phiz = sourceProgress(hiz, ix);

describe("Dağıt dilimleri", () => {
  it("konu: bölüm konusu + konusu eşleşen tekil ÖSYM testi", () => {
    const s = topicSlice({ progress: pkd, range: null }, "uslu");
    expect(s.units.map((u) => `${u.sectionId}:${u.number}`)).toEqual([
      ...[46, 47, 48, 49, 50, 51, 52, 53].map((n) => `kd-uslu:${n}`),
      "kd-o:2",
    ]);
    expect(sourceHasTopic(pkd, "uslu")).toBe(true);
    expect(sourceHasTopic(phiz, "koklu")).toBe(false);
  });

  it("aralık süzgeci ve kaynak+seri", () => {
    expect(topicSlice({ progress: pkd, range: { from: 50, to: 60 } }, "uslu").units.map((u) => u.number)).toEqual([50, 51, 52, 53]);
    expect(seriesSlice({ progress: pkd, range: null }, "kd-osym").units.map((u) => u.number)).toEqual([1, 2, 3]);
  });

  it("dağıtımdan görevler: kaynak ve seri başına ayrı görev, tek batch günleri", () => {
    const slices = [topicSlice({ progress: pkd, range: null }, "uslu"), topicSlice({ progress: phiz, range: null }, "uslu")];
    const rows = distribute(slices, asDateStr("2026-11-20"), { kind: "days", days: 3 }, new Set<IsoWeekday>([7]));
    const plans = plansFromRows(rows, new Map([["kd", pkd], ["hiz", phiz]]), topics, () => "Çöz + Analiz");
    // kd: 9 test → 3/3/3 (son gün ÖSYM 2 ayrı seri → ayrı görev), hız: 10 → 3/3/4
    expect(plans.map((p) => `${p.dueDate} ${p.title}`)).toEqual([
      "2026-11-20 Kafadengi | kd-uslu | 46 - 48. Testler | Çöz + Analiz",
      "2026-11-20 Hız | hiz-uslu | 51 - 53. Testler | Çöz + Analiz",
      "2026-11-21 Kafadengi | kd-uslu | 49 - 51. Testler | Çöz + Analiz",
      "2026-11-21 Hız | hiz-uslu | 54 - 56. Testler | Çöz + Analiz",
      "2026-11-23 Kafadengi | kd-uslu | 52 - 53. Testler | Çöz + Analiz",
      "2026-11-23 Kafadengi | ÖSYM Tipi 2 | Üslü Sayılar | Çöz + Analiz",
      "2026-11-23 Hız | hiz-uslu | 57 - 60. Testler | Çöz + Analiz",
    ]);
    expect(plans.every((p) => p.itemIds.length === p.units)).toBe(true);
  });
});
