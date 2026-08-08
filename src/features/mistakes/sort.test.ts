import { describe, expect, test } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { mistake } from "@/features/testing/fixtures";
import { sortTree, SORT_MODES, type SortMode } from "./sort";
import { buildTree } from "./tree";

const MONDAY = asDateStr("2026-08-10");

/** Fixture → ağaç kısayolu; sıralama testlerinin girdisi hep buradan gelir. */
function tree(list: ReturnType<typeof mistake>[]) {
  return buildTree(list, MONDAY);
}

describe("sortTree — most (en çok yanlış)", () => {
  test("dersleri toplama göre azalan sıralar", () => {
    const t = tree([
      mistake({ ders: "Fizik" }),
      mistake({ ders: "Matematik" }),
      mistake({ ders: "Matematik" }),
      mistake({ ders: "Kimya" }),
      mistake({ ders: "Kimya" }),
      mistake({ ders: "Kimya" }),
    ]);

    expect(sortTree(t, "most").map((d) => d.ders)).toEqual([
      "Kimya",
      "Matematik",
      "Fizik",
    ]);
  });

  test("konuları da toplama göre azalan sıralar", () => {
    const t = tree([
      mistake({ konu: "İntegral" }),
      mistake({ konu: "Türev" }),
      mistake({ konu: "Türev" }),
    ]);

    expect(sortTree(t, "most")[0].konular.map((k) => k.konu)).toEqual([
      "Türev",
      "İntegral",
    ]);
  });

  test("beraberlik anahtara göre deterministik bozulur", () => {
    const list = [mistake({ ders: "Zooloji" }), mistake({ ders: "Astronomi" })];

    const first = sortTree(tree(list), "most").map((d) => d.ders);
    const second = sortTree(tree([...list].reverse()), "most").map((d) => d.ders);

    expect(first).toEqual(second);
    expect(first).toEqual(["Astronomi", "Zooloji"]);
  });
});

describe("sortTree — due (tekrarı gelen önce)", () => {
  test("vadesi gelen sayısı fazla olan ders öne geçer", () => {
    // Matematik toplamda daha az yanlış içerir ama tekrarı gelen daha
    // çoktur: bu modda önce o gelmeli.
    const t = tree([
      mistake({ ders: "Matematik", nextReviewDate: "2026-08-01" }),
      mistake({ ders: "Matematik", nextReviewDate: "2026-08-02" }),
      mistake({ ders: "Fizik", nextReviewDate: "2026-12-31" }),
      mistake({ ders: "Fizik", nextReviewDate: "2026-12-31" }),
      mistake({ ders: "Fizik", nextReviewDate: "2026-12-31" }),
    ]);

    expect(sortTree(t, "due").map((d) => d.ders)).toEqual(["Matematik", "Fizik"]);
  });

  test("eşit dueCount'ta toplama göre bozulur", () => {
    const t = tree([
      mistake({ ders: "Fizik", nextReviewDate: "2026-08-01" }),
      mistake({ ders: "Matematik", nextReviewDate: "2026-08-01" }),
      mistake({ ders: "Matematik", nextReviewDate: "2026-12-31" }),
    ]);

    expect(sortTree(t, "due").map((d) => d.ders)).toEqual(["Matematik", "Fizik"]);
  });

  test("konu seviyesine de uygulanır", () => {
    const t = tree([
      mistake({ konu: "İntegral", nextReviewDate: "2026-08-01" }),
      mistake({ konu: "Türev", nextReviewDate: "2026-12-31" }),
      mistake({ konu: "Türev", nextReviewDate: "2026-12-31" }),
    ]);

    expect(sortTree(t, "due")[0].konular.map((k) => k.konu)).toEqual([
      "İntegral",
      "Türev",
    ]);
  });
});

describe("sortTree — recent (en yeni)", () => {
  test("en yeni yanlışı olan ders öne geçer", () => {
    const t = tree([
      mistake({ ders: "Fizik", date: "2026-08-12" }),
      mistake({ ders: "Matematik", date: "2026-08-01" }),
      mistake({ ders: "Matematik", date: "2026-08-02" }),
      mistake({ ders: "Matematik", date: "2026-08-03" }),
    ]);

    // Matematik toplamda daha çok yanlış içerse de Fizik daha yenidir.
    expect(sortTree(t, "recent").map((d) => d.ders)).toEqual(["Fizik", "Matematik"]);
  });

  test("konu seviyesine de uygulanır", () => {
    const t = tree([
      mistake({ konu: "Türev", date: "2026-08-01" }),
      mistake({ konu: "Türev", date: "2026-08-02" }),
      mistake({ konu: "İntegral", date: "2026-08-12" }),
    ]);

    expect(sortTree(t, "recent")[0].konular.map((k) => k.konu)).toEqual([
      "İntegral",
      "Türev",
    ]);
  });

  test("aynı tarihte anahtara göre bozulur", () => {
    const list = [
      mistake({ ders: "Zooloji", date: "2026-08-10" }),
      mistake({ ders: "Astronomi", date: "2026-08-10" }),
    ];

    const first = sortTree(tree(list), "recent").map((d) => d.ders);
    const second = sortTree(tree([...list].reverse()), "recent").map((d) => d.ders);

    expect(first).toEqual(second);
    expect(first).toEqual(["Astronomi", "Zooloji"]);
  });
});

describe("sortTree — genel", () => {
  test("boş ağaç boş döner", () => {
    expect(sortTree([], "most")).toEqual([]);
  });

  test("girdiyi mutate etmez", () => {
    const t = tree([
      mistake({ ders: "Fizik" }),
      mistake({ ders: "Matematik" }),
      mistake({ ders: "Matematik" }),
    ]);
    const before = t.map((d) => d.ders);

    sortTree(t, "most");

    expect(t.map((d) => d.ders)).toEqual(before);
  });

  test("konu dizisini de mutate etmez", () => {
    const t = tree([
      mistake({ konu: "İntegral" }),
      mistake({ konu: "Türev" }),
      mistake({ konu: "Türev" }),
    ]);
    const before = t[0].konular.map((k) => k.konu);

    sortTree(t, "most");

    expect(t[0].konular.map((k) => k.konu)).toEqual(before);
  });

  test("hiçbir mod düğüm kaybetmez", () => {
    const list = [
      mistake({ ders: "Matematik", konu: "Türev" }),
      mistake({ ders: "Matematik", konu: "İntegral" }),
      mistake({ ders: "Fizik", konu: "Hareket" }),
    ];

    for (const { value } of SORT_MODES) {
      const sorted = sortTree(tree(list), value);
      const total = sorted.reduce((acc, d) => acc + d.total, 0);
      const konuCount = sorted.reduce((acc, d) => acc + d.konular.length, 0);

      expect(total).toBe(list.length);
      expect(konuCount).toBe(3);
    }
  });

  test("SORT_MODES her SortMode'u tam olarak bir kez içerir", () => {
    const values = SORT_MODES.map((m) => m.value);
    const expected: SortMode[] = ["most", "due", "recent"];

    expect(new Set(values).size).toBe(values.length);
    expect([...values].sort()).toEqual([...expected].sort());
  });
});
