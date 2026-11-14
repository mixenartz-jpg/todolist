import { describe, expect, it } from "vitest";
import { parseToc } from "./toc";
import { buildDraft, diffTree, sectionKey } from "./tree";
import type { SeriesNode, Topic } from "./types";

const BOOK = { kind: "kitap", unit: "test" } as const;
const topics: Topic[] = [
  { id: "t-bhh", subject: "Fizik", exam: "AYT", name: "Basit Harmonik Hareket", aliases: [], sortOrder: 0 },
  { id: "t-dalga", subject: "Fizik", exam: "AYT", name: "Dalga Mekaniği", aliases: [], sortOrder: 1 },
];
const scope = { subject: "Fizik", exam: "AYT" as const };

function ids() {
  let n = 0;
  return () => `new-${++n}`;
}

function draftFor(text: string, existing: SeriesNode[] = [], extra = {}) {
  return buildDraft(parseToc(text, BOOK), existing, topics, { ...scope, newId: ids(), ...extra });
}

const EXISTING: SeriesNode[] = [
  {
    id: "s1", sourceId: "src", name: "Konu Testleri", kind: "konu", sortOrder: 0,
    sections: [
      {
        id: "sec-bhh", seriesId: "s1", topicId: "t-bhh", label: "Basit Harmonik Hareket", unitFrom: 1, unitTo: 3, sortOrder: 0,
        items: [1, 2, 3].map((n) => ({ id: `i${n}`, sectionId: "sec-bhh", number: n, topicId: null })),
      },
      {
        id: "sec-dalga", seriesId: "s1", topicId: "t-dalga", label: "Dalga Mekaniği", unitFrom: 4, unitTo: 5, sortOrder: 1,
        items: [4, 5].map((n) => ({ id: `i${n}`, sectionId: "sec-dalga", number: n, topicId: null })),
      },
    ],
  },
];

describe("buildDraft", () => {
  it("konular eşleşir; eşleşmeyen 'yeni konu' (topicId null); aralıklı başlığa konu aranmaz", () => {
    const d = draftFor("BHH yeni | 1-2\nBasit Harmonik Hareket | 3-4\n# ÖSYM Tipi | 1-10\n7 = Dalga Mekaniği");
    expect(d[0].sections.map((s) => s.topicId)).toEqual([null, "t-bhh"]);
    expect(d[1].sections[0]).toMatchObject({ implicit: true, topicId: null });
    expect(d[1].kind).toBe("osym");
    expect(d[1].itemTopics).toEqual([{ number: 7, topicName: "Dalga Mekaniği", topicId: "t-dalga" }]);
  });

  it("mevcut seri/bölüm kimlikleri korunur; etiket düzeltilse aralıktan eşleşir", () => {
    const d = draftFor("Basit Harmonik Hareket | 1-3\nDalga Mek. | 4-5\nYeni | 6-7", EXISTING);
    expect(d[0].id).toBe("s1");
    expect(d[0].sections.map((s) => [s.id, s.existing])).toEqual([
      ["sec-bhh", true],
      ["sec-dalga", true],
      ["new-1", false],
    ]);
    // Etiketi değişen bölümün elle konusu korunur.
    expect(d[0].sections[1].topicId).toBe("t-dalga");
  });

  it("elle konu ve seri türü seçimi ezer", () => {
    const d = draftFor("# Yaprak | 1-4\nBHH | 5-6", [], {
      kindOverrides: { yaprak: "sarmal" },
      topicOverrides: { [sectionKey("Yaprak", "BHH")]: "t-bhh" },
    });
    expect(d[0].kind).toBe("sarmal");
    expect(d[0].sections[1].topicId).toBe("t-bhh");
  });
});

describe("diffTree", () => {
  it("bölüm sınırı kayınca test aynı kalır, yalnızca bölümü değişir", () => {
    const draft = draftFor("Basit Harmonik Hareket | 1-4\nDalga Mekaniği | 5-6", EXISTING);
    const ops = diffTree("src", "test", draft, EXISTING, ids());
    const item4 = ops.items.find((i) => i.number === 4)!;
    expect(item4).toMatchObject({ id: "i4", section_id: "sec-bhh" });
    expect(ops.items.find((i) => i.number === 6)?.id).toBe("new-1");
    expect(ops.deleteItems).toEqual([]);
    expect(ops.deleteSections).toEqual([]);
    expect(ops.totalUnits).toBe(6);
  });

  it("silinen satırın bölüm ve testleri silinir", () => {
    const draft = draftFor("Basit Harmonik Hareket | 1-3", EXISTING);
    const ops = diffTree("src", "test", draft, EXISTING, ids());
    expect(ops.deleteSections).toEqual(["sec-dalga"]);
    expect(ops.deleteItems).toEqual(["i4", "i5"]);
  });

  it("seri değişince eski seri silinir; sıra satır sırasıdır", () => {
    const draft = draftFor("# Sarmal | 1-2\n# Konu Testleri\nBasit Harmonik Hareket | 1-3", EXISTING);
    const ops = diffTree("src", "test", draft, EXISTING, ids());
    expect(ops.series.map((s) => [s.name, s.sort_order])).toEqual([
      ["Sarmal", 0],
      ["Konu Testleri", 1],
    ]);
    expect(ops.deleteSeries).toEqual([]);
    expect(ops.deleteSections).toEqual(["sec-dalga"]);
  });

  it("test dışı birimde item üretilmez; item konusu 'N = Konu'dan", () => {
    const pages = buildDraft(parseToc("Konu | 1-50", { kind: "kitap", unit: "sayfa" }), [], topics, {
      ...scope,
      newId: ids(),
    });
    expect(diffTree("src", "sayfa", pages, [], ids()).items).toEqual([]);

    const osym = draftFor("# ÖSYM Tipi | 1-3\n2 = Dalga Mekaniği");
    const ops = diffTree("src", "test", osym, [], ids());
    expect(ops.items.map((i) => i.topic_id)).toEqual([null, "t-dalga", null]);
  });
});
