import { describe, expect, it } from "vitest";
import { guessSeriesKind, parseAmount, parseToc, tocText } from "./toc";

const BOOK = { kind: "kitap", unit: "test" } as const;
const PAGES = { kind: "kitap", unit: "sayfa" } as const;
const VIDEO = { kind: "video", unit: "ders" } as const;

const brief = (text: string, opts: Parameters<typeof parseToc>[1] = BOOK) => {
  const r = parseToc(text, opts);
  return {
    series: r.series.map((s) => ({
      name: s.name,
      kind: s.kind,
      sections: s.sections.map((x) => `${x.label}:${x.from}-${x.to}`),
      items: s.itemTopics.map((t) => `${t.number}=${t.topic}`),
    })),
    errors: r.errors.map((e) => `${e.line}: ${e.message}`),
  };
};

describe("parseAmount", () => {
  it("aralık, tek numara, adet ve 'Testler' eki", () => {
    expect(parseAmount("1-74")).toEqual({ kind: "range", from: 1, to: 74 });
    expect(parseAmount("280 – 301")).toEqual({ kind: "range", from: 280, to: 301 });
    expect(parseAmount("39 - 42. Testler")).toEqual({ kind: "range", from: 39, to: 42 });
    expect(parseAmount("12")).toEqual({ kind: "range", from: 12, to: 12 });
    expect(parseAmount("8 test")).toEqual({ kind: "count", count: 8 });
    expect(parseAmount("8 TEST")).toEqual({ kind: "count", count: 8 });
    expect(parseAmount("20 sayfa")).toEqual({ kind: "count", count: 20 });
    expect(parseAmount("bir iki")).toBeNull();
  });
});

describe("parseToc — kitap", () => {
  it("'Üslü Sayılar | 1-74' ve '8 test' önceki bölümün devamı", () => {
    expect(brief("Üslü Sayılar | 1-74\nKöklü Sayılar | 8 test\nÇarpanlara Ayırma | 8 test")).toEqual({
      series: [
        {
          name: "Konu Testleri",
          kind: "konu",
          sections: ["Üslü Sayılar:1-74", "Köklü Sayılar:75-82", "Çarpanlara Ayırma:83-90"],
          items: [],
        },
      ],
      errors: [],
    });
  });

  it("ilk satır '8 test' ise 1'den başlar", () => {
    expect(brief("Köklü Sayılar | 8 test\nÜslü | 8 test").series[0].sections).toEqual([
      "Köklü Sayılar:1-8",
      "Üslü:9-16",
    ]);
  });

  it("boş satırlar ve fazla boşluklar atlanır", () => {
    expect(brief("\n\n   Üslü   Sayılar |  1 - 10  \n\n").series[0].sections).toEqual(["Üslü Sayılar:1-10"]);
  });

  it("Türkçe karakterler korunur", () => {
    expect(brief("IŞIK ve Gölge | 1-5\nİşçi Problemleri | 6-9").series[0].sections).toEqual([
      "IŞIK ve Gölge:1-5",
      "İşçi Problemleri:6-9",
    ]);
  });

  it("hatalı satır numarasıyla raporlanır, diğerleri ayrıştırılır", () => {
    const r = brief("Üslü | 1-10\nsadece konu\nKöklü | x-y\nTers | 10-5\nÇakışan | 5-12\nİyi | 11-20");
    expect(r.series[0].sections).toEqual(["Üslü:1-10", "İyi:11-20"]);
    expect(r.errors).toEqual([
      "2: Biçim: 'Konu | 1-74' ya da 'Konu | 8 test'",
      '3: Aralık okunamadı: "x-y"',
      "4: Aralık ters ya da 1'den küçük",
      '5: "Üslü" (1-10) ile çakışıyor',
    ]);
  });

  it("boş metin boş ağaç", () => {
    expect(brief("")).toEqual({ series: [], errors: [] });
  });
});

describe("parseToc — seriler", () => {
  const TEXT = [
    "# Konu Testleri",
    "Basit Harmonik Hareket | 39-46",
    "Dalga Mekaniği | 47-51",
    "# ÖSYM Tipi | 1-10",
    "7 = Basit Harmonik Hareket",
    "# Sarmal | 1-8",
    "# Simülasyon | 1-5",
  ].join("\n");

  it("'#' seri açar, tür addan tahmin edilir, aralıklı başlık tek bölüm olur", () => {
    expect(brief(TEXT)).toEqual({
      series: [
        { name: "Konu Testleri", kind: "konu", sections: ["Basit Harmonik Hareket:39-46", "Dalga Mekaniği:47-51"], items: [] },
        { name: "ÖSYM Tipi", kind: "osym", sections: ["ÖSYM Tipi:1-10"], items: ["7=Basit Harmonik Hareket"] },
        { name: "Sarmal", kind: "sarmal", sections: ["Sarmal:1-8"], items: [] },
        { name: "Simülasyon", kind: "simulasyon", sections: ["Simülasyon:1-5"], items: [] },
      ],
      errors: [],
    });
    expect(parseToc(TEXT, BOOK).series[1].sections[0].implicit).toBe(true);
  });

  it("'N = Konu' seride olmayan testte ve test dışı birimde hata", () => {
    expect(brief("# ÖSYM Tipi | 1-10\n12 = Dalga").errors).toEqual(["2: 12. test bu seride yok"]);
    expect(brief("Konu | 1-10\n3 = Dalga", PAGES).errors).toEqual([
      "2: 'N = Konu' yalnızca test birimli kaynaklarda",
    ]);
  });

  it("bölümsüz seri başlığı hata; numaralar her seride 1'den başlayabilir", () => {
    const r = brief("# Boş\n# Sarmal\nA | 4 test");
    expect(r.errors).toEqual(["1: Seride bölüm yok"]);
    expect(r.series).toEqual([{ name: "Sarmal", kind: "sarmal", sections: ["A:1-4"], items: [] }]);
  });

  it("tür tahmini Türkçe duyarsız", () => {
    expect(guessSeriesKind("OSYM TİPİ")).toBe("osym");
    expect(guessSeriesKind("Simulasyon Denemeleri")).toBe("simulasyon");
    expect(guessSeriesKind("Yaprak Testler")).toBe("diger");
  });
});

describe("parseToc — video", () => {
  it("'12 | Konu' ders no, 'Konu | 10-14' ders aralığı", () => {
    expect(brief("12 | Basit Harmonik Hareket\nDalga Mekaniği | 13-16\nAtom | 2 ders", VIDEO)).toEqual({
      series: [
        {
          name: "Dersler",
          kind: "konu",
          sections: ["Basit Harmonik Hareket:12-12", "Dalga Mekaniği:13-16", "Atom:17-18"],
          items: [],
        },
      ],
      errors: [],
    });
  });

  it("hatalı video satırı", () => {
    expect(brief("Basit Harmonik", VIDEO).errors).toEqual(["1: Biçim: '12 | Konu' ya da 'Konu | 10-14'"]);
  });
});

describe("tocText gidiş-dönüş", () => {
  it.each([
    ["kitap tek seri", "Üslü Sayılar | 1-74\nKöklü Sayılar | 75-82", BOOK],
    [
      "çok seri",
      "# Konu Testleri\nBHH | 39-46\n\n# ÖSYM Tipi | 1-10\n7 = BHH\n\n# Sarmal | 1-8",
      BOOK,
    ],
    ["video", "12 | Basit Harmonik Hareket\nDalga | 13-16", VIDEO],
  ] as const)("%s", (_name, text, opts) => {
    const parsed = parseToc(text, opts);
    const again = tocText(
      parsed.series.map((s) => ({
        name: s.name,
        sections: s.sections,
        itemTopics: s.itemTopics,
      })),
      opts,
    );
    expect(again).toBe(text);
  });
});
