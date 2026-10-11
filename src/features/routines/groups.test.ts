import { describe, expect, it } from "vitest";
import { routine } from "@/features/testing/fixtures";
import type { Category } from "@/features/planlama/types";
import { groupRoutines, orderByCategory, planMoveToGroup } from "./groups";

function category(id: string, options: Partial<Category> = {}): Category {
  return { id, name: id, colorSlot: 0, sortOrder: 0, archivedAt: null, ...options };
}

const MAT = category("mat");
const FIZ = category("fiz");

describe("groupRoutines", () => {
  it("rutinleri kategori sırasıyla gruplar, kategorisizler sonda", () => {
    const a = routine({ id: "a", categoryId: "fiz" });
    const b = routine({ id: "b" });
    const c = routine({ id: "c", categoryId: "mat" });

    const groups = groupRoutines([a, b, c], [MAT, FIZ]);

    expect(groups.map((g) => [g.category?.id ?? null, g.routines.map((r) => r.id)])).toEqual([
      ["mat", ["c"]],
      ["fiz", ["a"]],
      [null, ["b"]],
    ]);
  });

  it("boş etkin kategoriyi de grup olarak gösterir", () => {
    const groups = groupRoutines([routine({ id: "a", categoryId: "mat" })], [MAT, FIZ]);
    expect(groups.map((g) => g.category?.id)).toEqual(["mat", "fiz"]);
  });

  it("kategorisiz grup yalnızca doluysa görünür", () => {
    const groups = groupRoutines([], [MAT]);
    expect(groups.map((g) => g.category?.id ?? null)).toEqual(["mat"]);
  });

  it("hiç kategori yoksa tek grup kategorisizdir", () => {
    const groups = groupRoutines([], []);
    expect(groups).toEqual([{ category: null, routines: [] }]);
  });

  it("arşivli kategori yalnızca rutini varsa ve sonda görünür", () => {
    const old = category("old", { archivedAt: "2026-01-01" });
    const empty = category("empty", { archivedAt: "2026-01-01" });
    const groups = groupRoutines(
      [routine({ id: "a", categoryId: "old" })],
      [old, empty, MAT],
    );
    expect(groups.map((g) => g.category?.id)).toEqual(["mat", "old"]);
  });

  it("bilinmeyen kategoriye bağlı rutin kategorisize düşer", () => {
    const groups = groupRoutines([routine({ id: "a", categoryId: "silinmis" })], [MAT]);
    expect(groups.at(-1)).toMatchObject({ category: null });
    expect(groups.at(-1)?.routines.map((r) => r.id)).toEqual(["a"]);
  });

  it("grup içinde girdi sırasını korur", () => {
    const groups = groupRoutines(
      [routine({ id: "x", categoryId: "mat" }), routine({ id: "y", categoryId: "mat" })],
      [MAT],
    );
    expect(groups[0].routines.map((r) => r.id)).toEqual(["x", "y"]);
  });
});

describe("orderByCategory", () => {
  it("grupları düzleştirir", () => {
    const list = orderByCategory(
      [routine({ id: "a" }), routine({ id: "b", categoryId: "fiz" }), routine({ id: "c", categoryId: "mat" })],
      [MAT, FIZ],
    );
    expect(list.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });
});

describe("planMoveToGroup", () => {
  const target = [
    { id: "x", sortOrder: 0 },
    { id: "y", sortOrder: 1 },
  ];
  const moved = { id: "m", sortOrder: 5 };

  it("satırın yerine yerleştirir, arkasındakileri kaydırır", () => {
    expect(planMoveToGroup(target, moved, 1)).toEqual([
      { id: "m", sortOrder: 1 },
      { id: "y", sortOrder: 2 },
    ]);
  });

  it("uzunluk verilirse sona ekler", () => {
    expect(planMoveToGroup(target, moved, 2)).toEqual([{ id: "m", sortOrder: 2 }]);
  });

  it("boş gruba ekler", () => {
    expect(planMoveToGroup([], moved, 0)).toEqual([{ id: "m", sortOrder: 0 }]);
  });

  it("numarası zaten doğru olsa da taşınan rutini yazar", () => {
    expect(planMoveToGroup([{ id: "x", sortOrder: 0 }], { id: "m", sortOrder: 1 }, 1)).toEqual([
      { id: "m", sortOrder: 1 },
    ]);
  });
});
