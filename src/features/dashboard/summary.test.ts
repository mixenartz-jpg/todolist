import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { entriesOn, noEntries, routine, task } from "@/features/testing/fixtures";
import { pendingRoutines, routineHeat, weekStrip } from "./summary";

const d = asDateStr;

// 2026-08-19 Çarşamba — haftası 17 Pzt ... 23 Paz.
const TODAY = d("2026-08-19");

describe("weekStrip", () => {
  it("Pazartesiden başlayan yedi gün verir", () => {
    const strip = weekStrip([], TODAY);

    expect(strip).toHaveLength(7);
    expect(strip[0].date).toBe("2026-08-17");
    expect(strip[0].weekday).toBe(1);
    expect(strip[6].date).toBe("2026-08-23");
  });

  it("işleri kendi gününe sayar", () => {
    const strip = weekStrip(
      [
        task({ dueDate: "2026-08-17", done: true }),
        task({ dueDate: "2026-08-17" }),
        task({ dueDate: "2026-08-19" }),
      ],
      TODAY,
    );

    expect(strip[0]).toMatchObject({ total: 2, done: 1 });
    expect(strip[2]).toMatchObject({ total: 1, done: 0 });
  });

  it("hafta DIŞINDAKİ işleri saymaz", () => {
    const strip = weekStrip(
      [task({ dueDate: "2026-08-10" }), task({ dueDate: "2026-08-25" })],
      TODAY,
    );

    expect(strip.every((s) => s.total === 0)).toBe(true);
  });

  it("tarihsiz işler hiçbir güne düşmez", () => {
    const strip = weekStrip([task({ dueDate: null })], TODAY);

    expect(strip.every((s) => s.total === 0)).toBe(true);
  });

  /*
   * Boş bir GELECEK gün "yapılmadı" değil "henüz gelmedi"dir; ikisini
   * aynı çizmek önümüzdeki haftayı başarısızlık listesi yapardı.
   */
  it("bugünü ve gelecek günleri işaretler", () => {
    const strip = weekStrip([], TODAY);

    expect(strip[2]).toMatchObject({ isToday: true, isFuture: false });
    expect(strip[1]).toMatchObject({ isToday: false, isFuture: false });
    expect(strip[3]).toMatchObject({ isToday: false, isFuture: true });
  });
});

describe("routineHeat", () => {
  it("bugün dahil son N günü verir, en eski başta", () => {
    const heat = routineHeat(noEntries, [], TODAY, 7);

    expect(heat).toHaveLength(7);
    expect(heat[0].date).toBe("2026-08-13");
    expect(heat[6].date).toBe("2026-08-19");
  });

  /*
   * `null` ≠ `0`: zorunlu rutini olmayan bir günü "%0" diye çizmek,
   * yapılacak bir şey olmadığı hâlde yapılmamış gibi göstermektir.
   */
  it("ölçülmeyen günde null döner, sıfır DEĞİL", () => {
    const heat = routineHeat(noEntries, [], TODAY, 3);

    expect(heat.every((h) => h.ratio === null)).toBe(true);
  });

  it("tamamlanan günde oran verir", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const e = entriesOn(r, { "2026-08-19": 1 });
    const heat = routineHeat(e, [r], TODAY, 2);

    expect(heat[0].ratio).toBe(0);
    expect(heat[1].ratio).toBe(1);
  });
});

describe("pendingRoutines", () => {
  it("bugün zorunlu ve işaretlenmemişleri sayar", () => {
    const a = routine({ id: "a", schedule: { kind: "daily" } });
    const b = routine({ id: "b", schedule: { kind: "daily" } });
    const e = entriesOn(a, { "2026-08-19": 1 });

    expect(pendingRoutines(e, [a, b], TODAY)).toBe(1);
  });

  it("bugün zorunlu olmayanı saymaz", () => {
    // 19 Çarşamba; rutin yalnızca Pzt/Cum zorunlu.
    const r = routine({ schedule: { kind: "weekdays", days: [1, 5] } });

    expect(pendingRoutines(noEntries, [r], TODAY)).toBe(0);
  });

  /*
   * Esnek rutinde `isDueOn` daima false — "bugün kaçırdım mı?" onlar
   * için anlamsız bir soru.
   */
  it("esnek rutini saymaz", () => {
    const r = routine({
      schedule: { kind: "flexible", per: "week", count: 3 },
    });

    expect(pendingRoutines(noEntries, [r], TODAY)).toBe(0);
  });
});
