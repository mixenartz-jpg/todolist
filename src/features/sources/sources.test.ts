import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { Task } from "@/features/tasks/types";
import { linkTask, looksLikeSourceTask, matchSource, parseRange } from "./parse";
import { sourceProgress, unionLength } from "./progress";
import type { Source } from "./types";

const src = (id: string, title: string, total = 100, aliases: string[] = []): Source => ({
  id, title, subject: null, totalTests: total, unit: "test", aliases, sortOrder: 0, archivedAt: null,
});
const SOURCES = [
  src("kd", "Kafadengi Matematik", 60),
  src("gm", "Güçlendiren Matematik", 80),
  src("fz", "345 AYT Fizik", 400),
  src("lgs", "LGS Çıkmış Sorular", 50, ["LGS Çıkmış"]),
];

function task(title: string, done = false, extra: Partial<Task> = {}): Task {
  return {
    id: title, title, dueDate: asDateStr("2026-11-14"), done, note: null, sortOrder: 0,
    completedAt: null, categoryId: null, goalId: null, nodeId: null, colorSlot: null,
    estimateMinutes: null, ...extra,
  };
}

describe("matchSource", () => {
  it("kısaltma ve Türkçe karakter", () => {
    expect(matchSource("Kafadengi Mat", SOURCES)?.id).toBe("kd");
    expect(matchSource("KAFADENGİ MATEMATİK", SOURCES)?.id).toBe("kd");
    expect(matchSource("Guclendiren Mat", SOURCES)?.id).toBe("gm");
    expect(matchSource("345 AYT Fizik", SOURCES)?.id).toBe("fz");
  });
  it("yanlış pozitif yok", () => {
    expect(matchSource("Kafa", SOURCES)).toBeNull();
    expect(matchSource("Kafadengi Fizik", SOURCES)).toBeNull();
    expect(matchSource("Rutin", SOURCES)).toBeNull();
  });
  it("takma ad", () => {
    expect(matchSource("LGS Çıkmış", SOURCES)?.id).toBe("lgs");
  });
});

describe("parseRange", () => {
  it("ilk X-Y, boşluklu ve tireli yazımlar", () => {
    expect(parseRange(["24-40 Arası Çöz + Analiz", "5 Test"])).toEqual({ from: 24, to: 40 });
    expect(parseRange(["Basit Harmonik Hareket", "280 - 301", "Çöz"])).toEqual({ from: 280, to: 301 });
    expect(parseRange(["Üslü Sayılar", "26–33 Arası"])).toEqual({ from: 26, to: 33 });
  });
  it("adet aralık değildir; ters aralık reddedilir", () => {
    expect(parseRange(["5 Test"])).toBeNull();
    expect(parseRange(["40-24"])).toBeNull();
  });
});

describe("linkTask", () => {
  it("ekran görüntüsündeki başlıklar", () => {
    expect(linkTask(task("Kafadengi Mat | Üslü Sayılar | 26-33 Arası Çöz + Analiz"), SOURCES)).toEqual({
      sourceId: "kd", range: { from: 26, to: 33 }, manual: false,
    });
    expect(linkTask(task("Güçlendiren Matematik | 24-40 Arası Çöz + Analiz | 5 Test"), SOURCES)?.range).toEqual({ from: 24, to: 40 });
    expect(linkTask(task("Rutin Paragraf"), SOURCES)).toBeNull();
    expect(linkTask(task("LGS Çıkmış Sorular | Çarpan katlar Derin Analiz"), SOURCES)).toEqual({
      sourceId: "lgs", range: null, manual: false,
    });
  });
  it("elle bağlama başlığı ezer", () => {
    const t = task("Ödev | 1-10", false, { sourceId: "fz", rangeFrom: 5, rangeTo: 9 });
    expect(linkTask(t, SOURCES)).toEqual({ sourceId: "fz", range: { from: 5, to: 9 }, manual: true });
  });
  it("kaynak görevi gibi duranlar", () => {
    expect(looksLikeSourceTask("Bilinmeyen Yayın | Konu | 1-5")).toBe(true);
    expect(looksLikeSourceTask("Rutin | Paragraf")).toBe(false);
    expect(looksLikeSourceTask("Tek parça")).toBe(false);
  });
});

describe("ilerleme", () => {
  it("aralık birleşimi tekrar saymaz ve sınırlara kırpar", () => {
    expect(unionLength([{ from: 1, to: 10 }, { from: 5, to: 15 }, { from: 20, to: 20 }], 100)).toBe(16);
    expect(unionLength([{ from: 1, to: 5 }, { from: 6, to: 8 }], 100)).toBe(8);
    expect(unionLength([{ from: 55, to: 70 }], 60)).toBe(6);
    expect(unionLength([], 60)).toBe(0);
  });

  it("yalnızca tamamlanan görevler sayılır", () => {
    const tasks = [
      task("Kafadengi Mat | Üslü | 1-10", true),
      task("Kafadengi Matematik | Köklü | 8-15", true),
      task("Kafadengi Mat | Üslü | 16-30", false),
      task("Kafadengi Mat | Tekrar", true),
    ];
    const kd = sourceProgress(SOURCES, tasks).find((p) => p.source.id === "kd")!;
    expect(kd.covered).toBe(15);
    expect(kd.ratio).toBeCloseTo(0.25);
    expect(kd.taskCount).toBe(4);
    expect(kd.doneCount).toBe(3);
    expect(kd.doneWithoutRange).toBe(1);
  });
});
