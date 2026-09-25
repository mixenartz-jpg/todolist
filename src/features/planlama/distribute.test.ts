import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { goalNode } from "@/features/testing/fixtures";
import { multiDayShortcut, parsePerDayCap, planDistribution } from "./distribute";

const d = asDateStr;

function nodes(...titles: string[]) {
  return titles.map((title, i) => goalNode({ id: `n${i}`, title }));
}

describe("planDistribution — tek gün", () => {
  it("seçilen düğümlerin hepsini o güne koyar", () => {
    const plan = planDistribution(
      nodes("Konu anlatımı", "Soru bankası"),
      { from: d("2026-10-12"), to: d("2026-10-12"), perDayCap: null },
      "g1",
    );

    expect(plan.drafts).toEqual([
      { nodeId: "n0", goalId: "g1", title: "Konu anlatımı", dueDate: d("2026-10-12") },
      { nodeId: "n1", goalId: "g1", title: "Soru bankası", dueDate: d("2026-10-12") },
    ]);
    expect(plan.overflow).toEqual([]);
  });

  it("başlığı düğümden AYNEN alır — serbest metin", () => {
    const plan = planDistribution(
      nodes("Asitler soru bankası 50 soru"),
      { from: d("2026-10-12"), to: d("2026-10-12"), perDayCap: null },
      "g1",
    );

    expect(plan.drafts[0].title).toBe("Asitler soru bankası 50 soru");
  });

  it("boş seçimde boş plan döner", () => {
    const plan = planDistribution(
      [],
      { from: d("2026-10-12"), to: d("2026-10-12"), perDayCap: null },
      "g1",
    );

    expect(plan).toEqual({ drafts: [], overflow: [] });
  });
});

describe("planDistribution — aralığa dağıtım", () => {
  it("gün başına sınırla sırayla dağıtır", () => {
    const plan = planDistribution(
      nodes("a", "b", "c", "d"),
      { from: d("2026-10-12"), to: d("2026-10-14"), perDayCap: 2 },
      "g1",
    );

    expect(plan.drafts.map((t) => [t.title, t.dueDate])).toEqual([
      ["a", d("2026-10-12")],
      ["b", d("2026-10-12")],
      ["c", d("2026-10-13")],
      ["d", d("2026-10-13")],
    ]);
  });

  it("sınır 1 ise her güne bir tane koyar", () => {
    const plan = planDistribution(
      nodes("a", "b", "c"),
      { from: d("2026-10-12"), to: d("2026-10-14"), perDayCap: 1 },
      "g1",
    );

    expect(plan.drafts.map((t) => t.dueDate)).toEqual([
      d("2026-10-12"),
      d("2026-10-13"),
      d("2026-10-14"),
    ]);
  });

  it("sınır yoksa aralıktaki İLK güne yığar", () => {
    // perDayCap null → "sınırsız". Tek gün akışının aralık hâli:
    // kullanıcı sınır vermediyse bölmeyi biz uydurmamalıyız.
    const plan = planDistribution(
      nodes("a", "b", "c"),
      { from: d("2026-10-12"), to: d("2026-10-14"), perDayCap: null },
      "g1",
    );

    expect(plan.drafts.every((t) => t.dueDate === d("2026-10-12"))).toBe(true);
  });

  it("girdi SIRASINI korur", () => {
    // Kullanıcı ağaçta gördüğü sırayla seçiyor; dağıtım o sırayı
    // bozarsa "önce konu, sonra soru" planı karışır.
    const plan = planDistribution(
      nodes("önce", "sonra"),
      { from: d("2026-10-12"), to: d("2026-10-13"), perDayCap: 1 },
      "g1",
    );

    expect(plan.drafts.map((t) => t.title)).toEqual(["önce", "sonra"]);
  });
});

describe("planDistribution — taşma", () => {
  it("günlere sığmayanları overflow'a koyar", () => {
    const list = nodes("a", "b", "c", "d", "e");
    const plan = planDistribution(
      list,
      { from: d("2026-10-12"), to: d("2026-10-13"), perDayCap: 2 },
      "g1",
    );

    expect(plan.drafts).toHaveLength(4);
    expect(plan.overflow.map((n) => n.title)).toEqual(["e"]);
  });

  it("taşanlar için görev taslağı ÜRETMEZ", () => {
    const plan = planDistribution(
      nodes("a", "b"),
      { from: d("2026-10-12"), to: d("2026-10-12"), perDayCap: 1 },
      "g1",
    );

    expect(plan.drafts.map((t) => t.title)).toEqual(["a"]);
    expect(plan.overflow.map((n) => n.title)).toEqual(["b"]);
  });

  it("tam sığdığında overflow boş kalır", () => {
    const plan = planDistribution(
      nodes("a", "b"),
      { from: d("2026-10-12"), to: d("2026-10-13"), perDayCap: 1 },
      "g1",
    );

    expect(plan.overflow).toEqual([]);
  });
});

describe("planDistribution — bozuk aralık", () => {
  it("bitiş başlangıçtan önceyse hepsi taşar", () => {
    const plan = planDistribution(
      nodes("a"),
      { from: d("2026-10-14"), to: d("2026-10-12"), perDayCap: 1 },
      "g1",
    );

    expect(plan.drafts).toEqual([]);
    expect(plan.overflow.map((n) => n.title)).toEqual(["a"]);
  });

  it("gün başına sınır 0 ise hepsi taşar", () => {
    const plan = planDistribution(
      nodes("a"),
      { from: d("2026-10-12"), to: d("2026-10-14"), perDayCap: 0 },
      "g1",
    );

    expect(plan.drafts).toEqual([]);
    expect(plan.overflow).toHaveLength(1);
  });
});

describe("parsePerDayCap", () => {
  it("geçerli sayıyı çözer", () => {
    expect(parsePerDayCap("3")).toBe(3);
  });

  it("boşlukları atar", () => {
    expect(parsePerDayCap("  2  ")).toBe(2);
  });

  it("BOŞ girdi geçersiz — 'sınırsız' değil", () => {
    // `parseTargetCount`'tan (goal.ts) ayrılan yer: orada boş "ölçü
    // yok" demekti. Burada aralığa dağıtırken sınırsız, hepsini ilk
    // güne yığmak olurdu ve kullanıcı aralık vererek bunu istememişti.
    expect(parsePerDayCap("")).toBeUndefined();
  });

  it("sıfırı reddeder", () => {
    expect(parsePerDayCap("0")).toBeUndefined();
  });

  it("üst sınırı aşanı reddeder", () => {
    expect(parsePerDayCap("100")).toBeUndefined();
  });

  it("sayı olmayanı reddeder", () => {
    expect(parsePerDayCap("iki")).toBeUndefined();
    expect(parsePerDayCap("2.5")).toBeUndefined();
    expect(parsePerDayCap("-1")).toBeUndefined();
  });
});

describe("multiDayShortcut", () => {
  const friday = d("2026-09-25");
  const saturday = d("2026-09-26");

  it("bu haftanın kalanı bugünden Pazar'a", () => {
    expect(multiDayShortcut(friday, "rest-of-week")).toEqual([
      d("2026-09-25"),
      d("2026-09-26"),
      d("2026-09-27"),
    ]);
  });

  it("hafta içi: bu haftanın kalan iş günleri", () => {
    expect(multiDayShortcut(d("2026-09-23"), "weekdays")).toEqual([
      d("2026-09-23"),
      d("2026-09-24"),
      d("2026-09-25"),
    ]);
  });

  it("hafta sonundaysa gelecek haftanın Pzt–Cum'u", () => {
    expect(multiDayShortcut(saturday, "weekdays")).toEqual([
      d("2026-09-28"),
      d("2026-09-29"),
      d("2026-09-30"),
      d("2026-10-01"),
      d("2026-10-02"),
    ]);
  });

  it("7 gün bugünden başlar", () => {
    const days = multiDayShortcut(friday, "next-7");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe(friday);
    expect(days[6]).toBe(d("2026-10-01"));
  });
});
