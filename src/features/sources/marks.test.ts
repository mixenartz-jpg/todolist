import { describe, expect, it } from "vitest";
import { applyRangeMark, parseRangeInput, rangeSelect, type RangeMarkSpan } from "./marks";

const m = (from: number, to: number, status: RangeMarkSpan["status"], at = "2026-11-01", note: string | null = null) => ({
  from, to, status, markedAt: at, note,
});
const brief = (list: RangeMarkSpan[]) => list.map((x) => `${x.from}-${x.to}:${x.status}`);

describe("applyRangeMark", () => {
  it("'1-52 çözüldü' boş bölüme yazılır", () => {
    expect(brief(applyRangeMark([], 1, 52, { status: "done", markedAt: "2026-11-14", note: null }))).toEqual(["1-52:done"]);
  });
  it("ortaya düşen işaret eskiyi böler", () => {
    const out = applyRangeMark([m(1, 100, "assigned")], 40, 60, { status: "done", markedAt: "2026-11-14", note: null });
    expect(brief(out)).toEqual(["1-39:assigned", "40-60:done", "61-100:assigned"]);
  });
  it("kaldırma deliği açar; bitişik aynı işaretler birleşir", () => {
    expect(brief(applyRangeMark([m(1, 100, "done")], 40, 60, null))).toEqual(["1-39:done", "61-100:done"]);
    expect(brief(applyRangeMark([m(1, 39, "done"), m(61, 100, "done")], 40, 60, { status: "done", markedAt: "2026-11-01", note: null }))).toEqual(["1-100:done"]);
  });
  it("ters girilen aralık düzelir", () => {
    expect(brief(applyRangeMark([], 52, 1, { status: "done", markedAt: "x", note: null }))).toEqual(["1-52:done"]);
  });
});

describe("parseRangeInput", () => {
  it("aralık, tek sayı, kırpma, hatalı", () => {
    expect(parseRangeInput("1-52", 1, 200)).toEqual({ from: 1, to: 52 });
    expect(parseRangeInput(" 7 ", 1, 200)).toEqual({ from: 7, to: 7 });
    expect(parseRangeInput("190-250", 1, 200)).toEqual({ from: 190, to: 200 });
    expect(parseRangeInput("300-310", 1, 200)).toBeNull();
    expect(parseRangeInput("abc", 1, 200)).toBeNull();
  });
});

describe("rangeSelect", () => {
  it("tık seçer/bırakır, shift+tık aralığı ekler", () => {
    let s = rangeSelect(new Set(), null, 3, false);
    expect([...s]).toEqual([3]);
    s = rangeSelect(s, 3, 6, true);
    expect([...s].sort((a, b) => a - b)).toEqual([3, 4, 5, 6]);
    s = rangeSelect(s, 6, 4, false);
    expect([...s].sort((a, b) => a - b)).toEqual([3, 5, 6]);
  });
});
