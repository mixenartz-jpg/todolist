import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import type { IsoWeekday } from "@/lib/date/types";
import { PLAN_THRESHOLDS } from "@/features/alerts/thresholds";
import {
  addWorkingDays,
  deletableTasks,
  distribute,
  parseNumberList,
  rowMinutes,
  shiftTasks,
  splitEven,
  splitPerDay,
  workingDays,
  type Slice,
} from "./distribute";
import { sectionUnitStates, isFree } from "./unitStatus";

const d = asDateStr;
const noSkip = new Set<IsoWeekday>();
const sunday = new Set<IsoWeekday>([7]);
const units = (key: string, nums: number[]): Slice => ({ key, units: nums.map((number) => ({ sectionId: key, number })) });
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const nums = (u: Array<{ number: number }>) => u.map((x) => x.number);

describe("eşit bölme", () => {
  it("tam bölünen ve kalanı son güne giden", () => {
    expect(splitEven(range(1, 12), 3).map((c) => c.length)).toEqual([4, 4, 4]);
    expect(splitEven(range(1, 14), 4).map((c) => c.length)).toEqual([3, 3, 3, 5]);
    expect(splitEven(range(46, 53), 3)).toEqual([[46, 47], [48, 49], [50, 51, 52, 53]]);
  });
  it("birim günden azsa birer birim, boş günler sonda", () => {
    expect(splitEven([1, 2], 4)).toEqual([[1], [2], [], []]);
  });
  it("günlük miktar: kalan son parçada", () => {
    expect(splitPerDay(range(1, 7), 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });
});

describe("atlanan günler", () => {
  it("çalışma günleri pazarı atlar", () => {
    // 2026-11-20 Cuma
    expect(workingDays(d("2026-11-20"), 4, sunday)).toEqual(["2026-11-20", "2026-11-21", "2026-11-23", "2026-11-24"]);
  });
  it("hepsi atlanırsa gün yok", () => {
    expect(workingDays(d("2026-11-20"), 3, new Set<IsoWeekday>([1, 2, 3, 4, 5, 6, 7]))).toEqual([]);
  });
});

describe("dağıt", () => {
  it("birden çok kaynak aynı günlere eşit bölünür (Kafadengi + Hız + Güçlendiren)", () => {
    const rows = distribute(
      [units("kd", range(46, 53)), units("hiz", range(51, 60)), units("gm", range(53, 74))],
      d("2026-11-20"),
      { kind: "days", days: 3 },
      sunday,
    );
    expect(rows.map((r) => r.date)).toEqual(["2026-11-20", "2026-11-21", "2026-11-23"]);
    expect(rows.map((r) => nums(r.cells.get("kd")!))).toEqual([[46, 47], [48, 49], [50, 51, 52, 53]]);
    expect(rows.map((r) => r.cells.get("hiz")!.length)).toEqual([3, 3, 4]);
    expect(rows.map((r) => r.cells.get("gm")!.length)).toEqual([7, 7, 8]);
  });

  it("günlük miktar kipinde her kaynak kendi hızında; gün sayısı en uzuna göre", () => {
    const rows = distribute([units("a", range(1, 5)), units("b", range(1, 2))], d("2026-11-16"), { kind: "perDay", perDay: 2 }, noSkip);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => nums(r.cells.get("a")!))).toEqual([[1, 2], [3, 4], [5]]);
    expect(rows.map((r) => nums(r.cells.get("b")!))).toEqual([[1, 2], [], []]);
  });

  it("testler bölünmez ve yalnızca gri/kırmızı birimler dağıtılır", () => {
    const states = sectionUnitStates({
      from: 1,
      to: 8,
      links: [],
      marks: [{ from: 3, to: 4, status: "assigned", markedAt: "2026-11-01", note: null }],
    });
    const free = states.filter(isFree).map((s) => s.number);
    expect(free).toEqual([1, 2, 5, 6, 7, 8]); // elle "ödevlendirildi" atlandı
    const rows = distribute([units("sarmal", free)], d("2026-11-16"), { kind: "days", days: 4 }, noSkip);
    for (const r of rows) for (const u of r.cells.get("sarmal")!) expect(Number.isInteger(u.number)).toBe(true);
    expect(rows.map((r) => nums(r.cells.get("sarmal")!))).toEqual([[1], [2], [5], [6, 7, 8]]);
  });

  it("günlük süre eşiği", () => {
    const rows = distribute([units("a", range(1, 20))], d("2026-11-16"), { kind: "days", days: 2 }, noSkip);
    const mpu = new Map([["a", 40]]);
    expect(rowMinutes(rows[0], mpu, 0)).toBe(400);
    expect(rowMinutes(rows[0], mpu, 0) > PLAN_THRESHOLDS.dailyMinutesWarn).toBe(true);
    expect(rowMinutes(rows[0], new Map([["a", 20]]), 90) > PLAN_THRESHOLDS.dailyMinutesWarn).toBe(false);
  });

  it("hücre düzenleme metni", () => {
    expect(parseNumberList("39-42, 45")).toEqual([39, 40, 41, 42, 45]);
    expect(parseNumberList("")).toEqual([]);
    expect(parseNumberList("42-39")).toBeNull();
    expect(parseNumberList("a")).toBeNull();
  });
});

describe("kaydır ve dağıtımı sil", () => {
  const tasks = [
    { id: "t1", dueDate: d("2026-11-19"), hasResult: true },
    { id: "t2", dueDate: d("2026-11-20"), hasResult: true }, // sonuçlu: yerinde kalır
    { id: "t3", dueDate: d("2026-11-20"), hasResult: false },
    { id: "t4", dueDate: d("2026-11-21"), hasResult: false },
  ];

  it("belirli tarihten sonraki sonuçsuz görevler N çalışma günü ileri; atlanan günlere düşmez", () => {
    expect(shiftTasks(tasks, d("2026-11-20"), 1, sunday)).toEqual([
      { id: "t3", dueDate: "2026-11-21" },
      { id: "t4", dueDate: "2026-11-23" }, // Cumartesi + 1 → Pazar atlandı → Pazartesi
    ]);
    expect(shiftTasks(tasks, d("2026-11-20"), 2, noSkip).map((x) => x.dueDate)).toEqual(["2026-11-22", "2026-11-23"]);
  });

  it("çalışma günü ekleme", () => {
    expect(addWorkingDays(d("2026-11-21"), 1, sunday)).toBe("2026-11-23");
    expect(addWorkingDays(d("2026-11-22"), 0, sunday)).toBe("2026-11-23");
  });

  it("dağıtımı sil yalnızca sonucu girilmemişleri seçer", () => {
    expect(deletableTasks(tasks)).toEqual(["t3", "t4"]);
  });
});
