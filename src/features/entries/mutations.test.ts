import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { patchRows } from "./mutations";
import type { CachedEntry } from "./queries";

const d = asDateStr;

const rows: CachedEntry[] = [
  { routine_id: "a", date: "2026-08-03", value: 1 },
  { routine_id: "a", date: "2026-08-04", value: 5 },
  { routine_id: "b", date: "2026-08-03", value: 1 },
];

describe("patchRows — optimistic yamalar", () => {
  it("yeni değer ekler", () => {
    const next = patchRows(rows, {
      routineId: "a",
      date: d("2026-08-05"),
      value: 1,
    });
    expect(next).toHaveLength(4);
    expect(next).toContainEqual({
      routine_id: "a",
      date: "2026-08-05",
      value: 1,
    });
  });

  it("mevcut değeri günceller", () => {
    const next = patchRows(rows, {
      routineId: "a",
      date: d("2026-08-04"),
      value: 8,
    });
    expect(next).toHaveLength(3);
    expect(next.find((r) => r.routine_id === "a" && r.date === "2026-08-04")).toEqual(
      { routine_id: "a", date: "2026-08-04", value: 8 },
    );
  });

  it("değer sıfırlanınca satırı siler", () => {
    const next = patchRows(rows, {
      routineId: "a",
      date: d("2026-08-04"),
      value: 0,
    });
    expect(next).toHaveLength(2);
    expect(
      next.find((r) => r.routine_id === "a" && r.date === "2026-08-04"),
    ).toBeUndefined();
  });

  it("olmayan satırı silmek güvenlidir", () => {
    const next = patchRows(rows, {
      routineId: "z",
      date: d("2026-08-09"),
      value: 0,
    });
    expect(next).toHaveLength(3);
  });

  it("aynı tarihteki farklı rutinleri karıştırmaz", () => {
    const next = patchRows(rows, {
      routineId: "a",
      date: d("2026-08-03"),
      value: 0,
    });
    // b rutininin aynı tarihli kaydı durmalı
    expect(next).toContainEqual({
      routine_id: "b",
      date: "2026-08-03",
      value: 1,
    });
    expect(next).toHaveLength(2);
  });

  it("girdi dizisini DEĞİŞTİRMEZ (immutable)", () => {
    const original = [...rows];
    patchRows(rows, { routineId: "a", date: d("2026-08-04"), value: 99 });
    expect(rows).toEqual(original);
  });

  it("boş önbellekte çalışır", () => {
    const next = patchRows([], {
      routineId: "a",
      date: d("2026-08-05"),
      value: 3,
    });
    expect(next).toEqual([{ routine_id: "a", date: "2026-08-05", value: 3 }]);
  });
});
