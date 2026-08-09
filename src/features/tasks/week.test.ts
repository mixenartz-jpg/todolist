import { describe, expect, it } from "vitest";
import { asDateStr, startOfIsoWeek } from "@/lib/date/date";
import { task } from "@/features/testing/fixtures";
import { buildWeekPlan, weekContainsToday } from "./week";

/*
 * 3 Ağustos 2026 Pazartesi'dir; hafta 9 Ağustos Pazar'da biter.
 * Testler bu haftayı sabit referans olarak kullanır.
 */
const MON = asDateStr("2026-08-03");
const TUE = asDateStr("2026-08-04");
const WED = asDateStr("2026-08-05");
const SUN = asDateStr("2026-08-09");

it("referans hafta gerçekten Pazartesi'de başlar", () => {
  // Diğer tüm testlerin dayandığı varsayım; yanlışsa hepsi sessizce
  // anlamsızlaşır.
  expect(startOfIsoWeek(WED)).toBe(MON);
});

describe("buildWeekPlan", () => {
  it("tamamlanmamış geçmiş görevi sonraki günlere TAŞIRMAZ", () => {
    // Asıl test: `tasksForDay` bu görevi Sal–Paz'ın hepsinde
    // döndürürdü. Izgarada tek sütunda kalmalı.
    const plan = buildWeekPlan([task({ dueDate: MON, done: false })], MON);

    expect(plan.days[0].tasks).toHaveLength(1);
    for (const day of plan.days.slice(1)) {
      expect(day.tasks).toHaveLength(0);
    }
  });

  it("her zaman 7 gün döner, Pazartesi'den Pazar'a", () => {
    const plan = buildWeekPlan([], MON);

    expect(plan.days).toHaveLength(7);
    expect(plan.days[0].date).toBe(MON);
    expect(plan.days[6].date).toBe(SUN);
    expect(plan.days.every((d) => d.tasks.length === 0)).toBe(true);
  });

  it("açık ve tamamlanmış sayıları ayırır", () => {
    const plan = buildWeekPlan(
      [
        task({ dueDate: TUE, done: true }),
        task({ dueDate: TUE, done: false }),
        task({ dueDate: TUE, done: false }),
      ],
      MON,
    );

    const tuesday = plan.days[1];
    expect(tuesday.doneCount).toBe(1);
    expect(tuesday.openCount).toBe(2);
    expect(plan.openTotal).toBe(2);
    expect(plan.doneTotal).toBe(1);
  });

  it("tarihsiz görevler ne sütuna ne gecikme kovasına girer", () => {
    const plan = buildWeekPlan([task({ dueDate: null })], MON);

    expect(plan.overdue).toHaveLength(0);
    expect(plan.days.every((d) => d.tasks.length === 0)).toBe(true);
  });

  it("hafta başından önceki tamamlanmamış görev gecikmedir", () => {
    const plan = buildWeekPlan(
      [task({ id: "gec", dueDate: "2026-07-30", done: false })],
      MON,
    );

    expect(plan.overdue.map((t) => t.id)).toEqual(["gec"]);
  });

  it("hafta İÇİNDEKİ tamamlanmamış görev gecikme kovasına ÇİFTLENMEZ", () => {
    // İnce olan bu: eşik `today` olsaydı (bugün Çarşamba iken)
    // Pazartesi'nin görevi hem sütununda hem kovada görünürdü.
    const plan = buildWeekPlan([task({ id: "pzt", dueDate: MON, done: false })], MON);

    expect(plan.days[0].tasks.map((t) => t.id)).toEqual(["pzt"]);
    expect(plan.overdue).toHaveLength(0);
  });

  it("hafta başından önceki TAMAMLANMIŞ görev hiçbir yerde görünmez", () => {
    const plan = buildWeekPlan(
      [task({ dueDate: "2026-07-30", done: true })],
      MON,
    );

    expect(plan.overdue).toHaveLength(0);
    expect(plan.days.every((d) => d.tasks.length === 0)).toBe(true);
    expect(plan.doneTotal).toBe(0);
  });

  it("haftadan sonraki görevler tamamen dışarıda kalır", () => {
    const plan = buildWeekPlan([task({ dueDate: "2026-08-10" })], MON);

    expect(plan.overdue).toHaveLength(0);
    expect(plan.days.every((d) => d.tasks.length === 0)).toBe(true);
  });

  it("görevleri doğru güne yerleştirir ve gelen sırayı korur", () => {
    const plan = buildWeekPlan(
      [
        task({ id: "a", dueDate: WED }),
        task({ id: "b", dueDate: MON }),
        task({ id: "c", dueDate: WED }),
      ],
      MON,
    );

    expect(plan.days[0].tasks.map((t) => t.id)).toEqual(["b"]);
    expect(plan.days[2].tasks.map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("haftanın son günü (Pazar) dahildir", () => {
    // Kapalı aralık hatası olsa Pazar sütunu sessizce boş kalırdı.
    const plan = buildWeekPlan([task({ id: "paz", dueDate: SUN })], MON);

    expect(plan.days[6].tasks.map((t) => t.id)).toEqual(["paz"]);
  });
});

describe("weekContainsToday", () => {
  it("bugünü içeren hafta için doğrudur — sınırlar dahil", () => {
    expect(weekContainsToday(MON, WED)).toBe(true);
    expect(weekContainsToday(MON, MON)).toBe(true);
    expect(weekContainsToday(MON, SUN)).toBe(true);
  });

  it("geçmiş ve gelecek haftalar için yanlıştır", () => {
    expect(weekContainsToday(asDateStr("2026-08-10"), WED)).toBe(false);
    expect(weekContainsToday(asDateStr("2026-07-27"), WED)).toBe(false);
  });
});
