import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { formatNumbers, planProgressTask, planTasks, progressLine, routineTitle } from "./title";
import type { SeriesKind, SourceTree, SourceUnit, Topic } from "./types";

const topics = new Map<string, Topic>([
  ["bhh", { id: "bhh", subject: "Fizik", exam: "AYT", name: "Basit Harmonik Hareket", aliases: [], sortOrder: 0 }],
  ["dalga", { id: "dalga", subject: "Fizik", exam: "AYT", name: "Dalga Mekaniği", aliases: [], sortOrder: 1 }],
]);
const day = asDateStr("2026-11-15");

type Sec = { id: string; label: string; from: number; to: number; topicId?: string; itemTopics?: Record<number, string> };
function tree(
  title: string,
  unit: SourceUnit,
  series: Array<{ id: string; name: string; kind: SeriesKind; sections: Sec[] }>,
  mpu: number | null = 20,
): SourceTree {
  return {
    id: "src", title, subject: "Fizik", exam: "AYT", kind: unit === "ders" ? "video" : "kitap", publisher: null,
    level: null, unit, minutesPerUnit: mpu, status: "sirada", totalTests: 0, studentId: null, aliases: [],
    sortOrder: 0, archivedAt: null,
    series: series.map((s, si) => ({
      id: s.id, sourceId: "src", name: s.name, kind: s.kind, sortOrder: si,
      sections: s.sections.map((sec, i) => ({
        id: sec.id, seriesId: s.id, topicId: sec.topicId ?? null, label: sec.label, unitFrom: sec.from, unitTo: sec.to,
        sortOrder: i,
        items:
          unit === "test"
            ? Array.from({ length: sec.to - sec.from + 1 }, (_, k) => ({
                id: `${sec.id}-${sec.from + k}`, sectionId: sec.id, number: sec.from + k,
                topicId: sec.itemTopics?.[sec.from + k] ?? null,
              }))
            : [],
      })),
    })),
  };
}

const BS = tree("BilgiSarmal AYT Fizik SB", "test", [
  { id: "konu", name: "Konu Testleri", kind: "konu", sections: [
    { id: "s-bhh", label: "Basit Harmonik Hareket", from: 39, to: 46, topicId: "bhh" },
    { id: "s-dalga", label: "Dalga Mekaniği", from: 47, to: 51, topicId: "dalga" },
  ] },
  { id: "osym", name: "ÖSYM Tipi", kind: "osym", sections: [{ id: "s-osym", label: "ÖSYM Tipi", from: 1, to: 10, itemTopics: { 7: "bhh" } }] },
  { id: "sarmal", name: "Sarmal Test", kind: "sarmal", sections: [{ id: "s-sarmal", label: "Sarmal Test", from: 1, to: 8 }] },
  { id: "sim", name: "Simülasyon Testi", kind: "simulasyon", sections: [{ id: "s-sim", label: "Simülasyon Testi", from: 1, to: 5 }] },
]);

const pick = (entries: Array<[string, number[]]>) => new Map(entries.map(([k, v]) => [k, new Set(v)]));

describe("başlık üretimi — test serileri", () => {
  it("konu serisi: aralık ve tek test", () => {
    const [a] = planTasks({ source: BS, topics, picks: pick([["s-bhh", [39, 40, 41, 42]]]), action: "Çöz", dueDate: day });
    expect(a.title).toBe("BilgiSarmal AYT Fizik SB | Basit Harmonik Hareket | 39 - 42. Testler | Çöz");
    expect(a).toMatchObject({ sectionId: "s-bhh", itemIds: ["s-bhh-39", "s-bhh-40", "s-bhh-41", "s-bhh-42"], estimateMinutes: 80, units: 4 });
    const [b] = planTasks({ source: BS, topics, picks: pick([["s-bhh", [44]]]), action: "Çöz", dueDate: day });
    expect(b.title).toBe("BilgiSarmal AYT Fizik SB | Basit Harmonik Hareket | 44. Test | Çöz");
  });

  it("ÖSYM: konu varsa eklenir", () => {
    expect(planTasks({ source: BS, topics, picks: pick([["s-osym", [7]]]), action: "Çöz", dueDate: day })[0].title).toBe(
      "BilgiSarmal AYT Fizik SB | ÖSYM Tipi 7 | Basit Harmonik Hareket | Çöz",
    );
    expect(planTasks({ source: BS, topics, picks: pick([["s-osym", [3]]]), action: "Çöz", dueDate: day })[0].title).toBe(
      "BilgiSarmal AYT Fizik SB | ÖSYM Tipi 3 | Çöz",
    );
  });

  it("sarmal ve simülasyon", () => {
    expect(planTasks({ source: BS, topics, picks: pick([["s-sarmal", [6]]]), action: "Çöz", dueDate: day })[0].title).toBe(
      "BilgiSarmal AYT Fizik SB | Sarmal Test 6 | Çöz",
    );
    expect(planTasks({ source: BS, topics, picks: pick([["s-sim", [3]]]), action: "Çöz", dueDate: day })[0].title).toBe(
      "BilgiSarmal AYT Fizik SB | Simülasyon Testi 3 | Çöz",
    );
  });

  it("farklı serilerden seçim → seri başına ayrı görev; aynı seride bölümler birleşir", () => {
    const plans = planTasks({
      source: BS,
      topics,
      picks: pick([["s-bhh", [45, 46]], ["s-dalga", [47]], ["s-sarmal", [1, 2]]]),
      action: "Çöz + Analiz",
      dueDate: day,
    });
    expect(plans.map((p) => p.title)).toEqual([
      "BilgiSarmal AYT Fizik SB | Basit Harmonik Hareket, Dalga Mekaniği | 45 - 47. Testler | Çöz + Analiz",
      "BilgiSarmal AYT Fizik SB | Sarmal Test 1-2 | Çöz + Analiz",
    ]);
    expect(plans[0].itemIds).toHaveLength(3);
  });

  it("ardışık olmayan numaralar", () => {
    expect(formatNumbers([43, 39, 40])).toBe("39 - 40, 43");
  });
});

describe("başlık üretimi — aralık birimleri", () => {
  const fizik = tree("345 AYT Fizik", "soru", [
    { id: "k", name: "Konu Testleri", kind: "konu", sections: [{ id: "s", label: "Basit Harmonik Hareket", from: 250, to: 320 }] },
  ], 2);

  it("kesin aralık; ardışık olmayan seçim ayrı görevler", () => {
    const plans = planTasks({ source: fizik, topics, picks: pick([["s", [280, 281, 282, 290]]]), action: "Çöz", dueDate: day });
    expect(plans.map((p) => [p.title, p.rangeFrom, p.rangeTo, p.estimateMinutes])).toEqual([
      ["345 AYT Fizik | Basit Harmonik Hareket | 280-282 | Çöz", 280, 282, 6],
      ["345 AYT Fizik | Basit Harmonik Hareket | 290 | Çöz", 290, 290, 2],
    ]);
  });

  it("İlerlet: hedef kadar rezervasyon, bölüm sonunda kırpılır", () => {
    const bs = tree("BilgiSarmal", "sayfa", [
      { id: "k", name: "Konu Testleri", kind: "konu", sections: [{ id: "p", label: "Problemler SB", from: 120, to: 130 }] },
    ], 3);
    expect(planProgressTask({ source: bs, sectionId: "p", start: 126, target: 10, dueDate: day })).toMatchObject({
      title: "BilgiSarmal | Problemler SB | İlerlet | ~10 sayfa",
      rangeFrom: 126,
      rangeTo: 130,
      targetAmount: 10,
      action: "İlerlet",
      estimateMinutes: 30,
    });
    expect(planProgressTask({ source: bs, sectionId: "p", start: 200, target: 10, dueDate: day })).toBeNull();
  });

  it("video: ders no - konu", () => {
    const v = tree("X Akademi AYT Fizik Kursu", "ders", [
      { id: "d", name: "Dersler", kind: "konu", sections: [{ id: "l", label: "Basit Harmonik Hareket", from: 12, to: 12 }] },
    ], 45);
    expect(planTasks({ source: v, topics, picks: pick([["l", [12]]]), action: "İzle + Feynman", dueDate: day })[0].title).toBe(
      "X Akademi AYT Fizik Kursu | 12 - Basit Harmonik Hareket | İzle + Feynman",
    );
  });

  it("rutin başlığı ve İlerlet satırı", () => {
    expect(routineTitle(" Paragraf Çözümü ")).toBe("Rutin | Paragraf Çözümü");
    expect(progressLine({ targetAmount: 10, rangeFrom: 126 }, { reachedTo: 133 }, "sayfa")).toBe(
      "Hedef ~10 sayfa → 8 sayfa ilerledi (126-133)",
    );
    expect(progressLine({ targetAmount: 10, rangeFrom: 126 }, null, "sayfa")).toBe("Hedef ~10 sayfa");
    expect(progressLine({ targetAmount: null }, null, "sayfa")).toBeNull();
  });
});
