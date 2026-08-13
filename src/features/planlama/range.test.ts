import { describe, expect, it } from "vitest";
import { asDateStr, eachDay, startOfIsoWeek } from "@/lib/date/date";
import { monthGrid } from "@/features/calendar/grid";
import { task } from "@/features/testing/fixtures";
import { anchorForScale, buildPlanRange, chunkWeeks } from "./range";
import type { PlanBucket } from "./range";

/*
 * 3 Ağustos 2026 Pazartesi'dir; hafta 9 Ağustos Pazar'da biter.
 * Ağustos 2026 Cumartesi başlar, yani ay ızgarası 27 Temmuz
 * Pazartesi'den başlar ve taşma günleri içerir.
 */
const MON = asDateStr("2026-08-03");
const TUE = asDateStr("2026-08-04");
const SUN = asDateStr("2026-08-09");

/** Referans haftanın günleri — ızgaranın çizeceği liste. */
const WEEK = eachDay(MON, SUN);

it("referans hafta gerçekten Pazartesi'de başlar", () => {
  // Diğer testlerin dayandığı varsayım; yanlışsa hepsi sessizce
  // anlamsızlaşır.
  expect(startOfIsoWeek(TUE)).toBe(MON);
  expect(WEEK).toHaveLength(7);
});

describe("buildPlanRange — hafta ölçeği", () => {
  it("her gün için bir hücre döner", () => {
    const range = buildPlanRange([], WEEK, MON, SUN);

    expect(range.buckets).toHaveLength(7);
    expect(range.buckets[0].date).toBe(MON);
    expect(range.buckets[6].date).toBe(SUN);
    expect(range.buckets.every((b) => b.inScope)).toBe(true);
  });

  it("tamamlanmamış görevi sonraki günlere TAŞIRMAZ", () => {
    // Asıl test: `tasksForDay` bu görevi Sal–Paz'ın hepsinde
    // döndürürdü. Izgarada tek hücrede kalmalı.
    const range = buildPlanRange(
      [task({ dueDate: MON, done: false })],
      WEEK,
      MON,
      SUN,
    );

    expect(range.buckets[0].tasks).toHaveLength(1);
    for (const bucket of range.buckets.slice(1)) {
      expect(bucket.tasks).toHaveLength(0);
    }
  });

  it("aralıktan sonraya tarihli görevi hiçbir kovaya koymaz", () => {
    const range = buildPlanRange(
      [task({ id: "gelecek", dueDate: asDateStr("2026-08-20") })],
      WEEK,
      MON,
      SUN,
    );

    expect(range.buckets.every((b) => b.tasks.length === 0)).toBe(true);
    expect(range.overdue).toHaveLength(0);
    expect(range.backlog).toHaveLength(0);
  });

  it("açık ve biten görevleri ayrı sayar", () => {
    const range = buildPlanRange(
      [
        task({ dueDate: MON, done: false }),
        task({ dueDate: MON, done: true }),
        task({ dueDate: TUE, done: false }),
      ],
      WEEK,
      MON,
      SUN,
    );

    expect(range.buckets[0].openCount).toBe(1);
    expect(range.buckets[0].doneCount).toBe(1);
    expect(range.openTotal).toBe(2);
    expect(range.doneTotal).toBe(1);
  });
});

describe("buildPlanRange — havuz (backlog)", () => {
  it("tarihsiz görevleri havuza koyar", () => {
    // `buildWeekPlan`'den AYRILAN yer: orada bu görev tamamen düşerdi.
    const range = buildPlanRange(
      [task({ id: "birara", dueDate: null })],
      WEEK,
      MON,
      SUN,
    );

    expect(range.backlog.map((t) => t.id)).toEqual(["birara"]);
    expect(range.buckets.every((b) => b.tasks.length === 0)).toBe(true);
  });

  it("tamamlanmış tarihsiz görevi havuza koymaz", () => {
    // Havuz bekleyen işler içindir; biten iş orada durmaz.
    const range = buildPlanRange(
      [task({ dueDate: null, done: true })],
      WEEK,
      MON,
      SUN,
    );

    expect(range.backlog).toHaveLength(0);
  });

  it("tarihsiz görev toplamlara girmez", () => {
    const range = buildPlanRange([task({ dueDate: null })], WEEK, MON, SUN);

    expect(range.openTotal).toBe(0);
    expect(range.doneTotal).toBe(0);
  });
});

describe("buildPlanRange — gecikenler", () => {
  it("aralıktan önceye tarihli tamamlanmamışı gecikmeye koyar", () => {
    const range = buildPlanRange(
      [task({ id: "geciken", dueDate: asDateStr("2026-07-20"), done: false })],
      WEEK,
      MON,
      SUN,
    );

    expect(range.overdue.map((t) => t.id)).toEqual(["geciken"]);
  });

  it("aralıktan önceki TAMAMLANMIŞ görevi gecikmeye koymaz", () => {
    const range = buildPlanRange(
      [task({ dueDate: asDateStr("2026-07-20"), done: true })],
      WEEK,
      MON,
      SUN,
    );

    expect(range.overdue).toHaveLength(0);
  });

  it("geciken görev bir de hücrede görünmez", () => {
    // Çifte sayım, `week.ts`'te uzun uzun anlatılan asıl tehlike.
    const range = buildPlanRange(
      [task({ dueDate: asDateStr("2026-07-20"), done: false })],
      WEEK,
      MON,
      SUN,
    );

    expect(range.buckets.every((b) => b.tasks.length === 0)).toBe(true);
    expect(range.overdue).toHaveLength(1);
  });
});

describe("buildPlanRange — ay ölçeği", () => {
  const CELLS = monthGrid(2026, 8);
  const DATES = CELLS.map((c) => c.date);
  const AUG_START = asDateStr("2026-08-01");
  const AUG_END = asDateStr("2026-08-31");

  it("ızgaranın tüm hücrelerini döner", () => {
    const range = buildPlanRange([], DATES, AUG_START, AUG_END);

    expect(range.buckets).toHaveLength(CELLS.length);
    expect(range.buckets.length % 7).toBe(0);
  });

  it("komşu aydan taşan günü inScope: false işaretler", () => {
    const range = buildPlanRange([], DATES, AUG_START, AUG_END);

    // Ağustos 2026 Cumartesi başlar; ilk hücreler Temmuz'dan taşar.
    expect(range.buckets[0].inScope).toBe(false);
    expect(range.buckets[0].date < AUG_START).toBe(true);

    const inAugust = range.buckets.filter((b) => b.inScope);
    expect(inAugust).toHaveLength(31);
  });

  it("taşma günündeki görev hücresinde görünür ama toplamlara girmez", () => {
    // Gerçek bir gündür ve görev alabilir; ama "Ağustos'ta 3 iş var"
    // rakamı Temmuz'un son günlerini saymamalı — yoksa aynı görev iki
    // ayda birden sayılırdı.
    const overflow = DATES[0];
    const range = buildPlanRange(
      [task({ dueDate: overflow, done: false })],
      DATES,
      AUG_START,
      AUG_END,
    );

    expect(range.buckets[0].tasks).toHaveLength(1);
    expect(range.buckets[0].openCount).toBe(1);
    expect(range.openTotal).toBe(0);
  });

  it("scope öncesi taşma günü GECİKME sayılmaz", () => {
    // Görev ızgarada zaten görünüyor; bir de gecikme kovasına
    // konsaydı iki kez sayılırdı.
    const overflow = DATES[0];
    const range = buildPlanRange(
      [task({ dueDate: overflow, done: false })],
      DATES,
      AUG_START,
      AUG_END,
    );

    expect(range.overdue).toHaveLength(0);
  });
});

describe("buildPlanRange — sınır durumlar", () => {
  it("boş gün listesiyle çökmez", () => {
    const range = buildPlanRange([task({ dueDate: MON })], [], MON, SUN);

    expect(range.buckets).toHaveLength(0);
    expect(range.openTotal).toBe(0);
  });

  it("görev yokken tüm hücreler boş döner", () => {
    const range = buildPlanRange([], WEEK, MON, SUN);

    expect(range.backlog).toHaveLength(0);
    expect(range.overdue).toHaveLength(0);
    expect(range.buckets.every((b) => b.tasks.length === 0)).toBe(true);
  });
});

describe("chunkWeeks", () => {
  /** Yalnızca tarih taşıyan sahte kova — bölme sırasını izlemek için. */
  function bucket(day: number): PlanBucket {
    return {
      date: asDateStr(`2026-08-${String(day).padStart(2, "0")}`),
      tasks: [],
      openCount: 0,
      doneCount: 0,
      inScope: true,
    };
  }

  function buckets(count: number): PlanBucket[] {
    return Array.from({ length: count }, (_, i) => bucket((i % 28) + 1));
  }

  it("42 kovayı 6 satıra böler, her satır 7 kova", () => {
    const weeks = chunkWeeks(buckets(42));

    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("35 kovayı 5 satıra böler", () => {
    expect(chunkWeeks(buckets(35))).toHaveLength(5);
  });

  it("hiçbir kova düşmez", () => {
    const input = buckets(42);
    expect(chunkWeeks(input).flat()).toHaveLength(input.length);
  });

  it("boş dizide boş dizi döner", () => {
    expect(chunkWeeks([])).toEqual([]);
  });

  it("7'nin katı olmayan girdide son satır kısa döner", () => {
    // Sessizce düşürmek ekrandan gün yerdi.
    const weeks = chunkWeeks(buckets(10));

    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toHaveLength(7);
    expect(weeks[1]).toHaveLength(3);
  });

  it("satır ve kova sırası korunur", () => {
    const input = buckets(14);
    const weeks = chunkWeeks(input);

    expect(weeks[0][0]).toBe(input[0]);
    expect(weeks[0][6]).toBe(input[6]);
    expect(weeks[1][0]).toBe(input[7]);
  });

  it("gerçek ay ızgarasını tam haftalara böler", () => {
    const range = buildPlanRange(
      [],
      monthGrid(2026, 8).map((c) => c.date),
      asDateStr("2026-08-01"),
      asDateStr("2026-08-31"),
    );

    const weeks = chunkWeeks(range.buckets);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("girdiyi değiştirmez", () => {
    const input = buckets(14);
    const copy = [...input];
    chunkWeeks(input);
    expect(input).toEqual(copy);
  });
});

describe("anchorForScale", () => {
  const TODAY = asDateStr("2026-08-05");

  it("aya geçerken ayın 1'ine oturur", () => {
    expect(anchorForScale(MON, "month", TODAY)).toBe(asDateStr("2026-08-01"));
  });

  it("çapa zaten ayın 1'iyse değişmez", () => {
    const first = asDateStr("2026-08-01");
    expect(anchorForScale(first, "month", TODAY)).toBe(first);
  });

  it("haftaya geçerken bakılan ay bugünü içeriyorsa bugünün haftasına gider", () => {
    const range = anchorForScale(asDateStr("2026-08-01"), "week", TODAY);
    expect(range).toBe(startOfIsoWeek(TODAY));
  });

  it("haftaya geçerken başka bir aya bakılıyorsa o ayın ilk haftasına gider", () => {
    // Bugüne ışınlanmak, kullanıcının baktığı ayı kaybettirirdi.
    const range = anchorForScale(asDateStr("2026-11-01"), "week", TODAY);
    expect(range).toBe(startOfIsoWeek(asDateStr("2026-11-01")));
  });

  it("hafta ölçeği her zaman bir Pazartesi döner", () => {
    for (const anchor of ["2026-08-01", "2026-11-15", "2027-01-31"]) {
      const result = anchorForScale(asDateStr(anchor), "week", TODAY);
      expect(startOfIsoWeek(result)).toBe(result);
    }
  });
});
