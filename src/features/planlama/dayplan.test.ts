import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { task } from "@/features/testing/fixtures";
import { buildDayPlan, daySummaries, hasPlanText } from "./dayplan";
import { buildPlanRange } from "./range";

const d = asDateStr;
// 2026-08-03 Pazartesi.
const MONDAY = d("2026-08-03");

describe("hasPlanText", () => {
  it("null ve boş metin plan sayılmaz", () => {
    expect(hasPlanText(null)).toBe(false);
    expect(hasPlanText("")).toBe(false);
  });

  it("yalnızca boşluktan oluşan metin plan SAYILMAZ", () => {
    // Aksi halde hücrede nokta durur ama panel boş açılır — işaret
    // yalan söylemiş olurdu.
    expect(hasPlanText("   ")).toBe(false);
    expect(hasPlanText("\n\t ")).toBe(false);
  });

  it("gerçek metin plan sayılır", () => {
    expect(hasPlanText("Sabah kütüphane")).toBe(true);
  });
});

describe("buildDayPlan", () => {
  it("saatlileri saate göre, sonra saatsizleri sıralar", () => {
    const view = buildDayPlan(
      [
        task({ id: "gec", dueDate: MONDAY, startTime: "14:00" }),
        task({ id: "saatsiz", dueDate: MONDAY }),
        task({ id: "erken", dueDate: MONDAY, startTime: "09:00" }),
      ],
      MONDAY,
      null,
    );

    expect(view.ordered.map((t) => t.id)).toEqual(["erken", "gec", "saatsiz"]);
  });

  it("açık ve bitmiş işleri ayrı sayar", () => {
    const view = buildDayPlan(
      [
        task({ dueDate: MONDAY, done: true }),
        task({ dueDate: MONDAY }),
        task({ dueDate: MONDAY }),
      ],
      MONDAY,
      null,
    );

    expect(view.total).toBe(3);
    expect(view.done).toBe(1);
    expect(view.summary.openCount).toBe(2);
    expect(view.summary.doneCount).toBe(1);
  });

  it("süreyi YALNIZCA saati olan işlerden toplar", () => {
    const view = buildDayPlan(
      [
        task({ dueDate: MONDAY, startTime: "09:00", durationMinutes: 60 }),
        task({ dueDate: MONDAY, startTime: "11:00", durationMinutes: 30 }),
        // Saatsiz ama süreli — DB kısıtı bunu engelliyor, yine de bozuk
        // bir satır toplamı şişirmemeli.
        task({ dueDate: MONDAY, startTime: null, durationMinutes: 45 }),
      ],
      MONDAY,
      null,
    );

    expect(view.minutes).toBe(90);
  });

  it("plan yazılı ama görev yoksa gün yine DOLUdur", () => {
    const view = buildDayPlan([], MONDAY, "Sabah kütüphane");

    expect(view.summary.hasPlan).toBe(true);
    expect(view.summary.openCount).toBe(0);
    expect(view.plan).toBe("Sabah kütüphane");
  });

  it("boşluktan ibaret planı null'a indirger", () => {
    const view = buildDayPlan([], MONDAY, "   ");

    expect(view.plan).toBeNull();
    expect(view.summary.hasPlan).toBe(false);
  });

  it("boş günde sıfır döner, hata vermez", () => {
    const view = buildDayPlan([], MONDAY, null);

    expect(view.total).toBe(0);
    expect(view.minutes).toBe(0);
    expect(view.summary).toEqual({
      openCount: 0,
      doneCount: 0,
      hasPlan: false,
    });
  });
});

describe("daySummaries", () => {
  it("her kovaya bir özet üretir ve plan noktasını işaretler", () => {
    const dates = [MONDAY, d("2026-08-04"), d("2026-08-05")];
    const range = buildPlanRange(
      [
        task({ dueDate: MONDAY }),
        task({ dueDate: MONDAY, done: true }),
      ],
      dates,
      MONDAY,
      d("2026-08-05"),
    );

    const summaries = daySummaries(range.buckets, new Set([d("2026-08-04")]));

    expect(summaries.size).toBe(3);
    expect(summaries.get(MONDAY)).toEqual({
      openCount: 1,
      doneCount: 1,
      hasPlan: false,
    });
    // İşi olmayan ama planı yazılı gün.
    expect(summaries.get(d("2026-08-04"))).toEqual({
      openCount: 0,
      doneCount: 0,
      hasPlan: true,
    });
    expect(summaries.get(d("2026-08-05"))?.hasPlan).toBe(false);
  });

  it("sayaçları kovadan alır, yeniden HESAPLAMAZ", () => {
    /*
     * İki yerde sayılsaydı, biri kategori filtresini görüp öteki
     * görmediğinde hücredeki rakam başlıktakiyle çelişirdi. Bu test o
     * bağı korur: kovanın sayacı ne diyorsa özet de onu der.
     */
    const range = buildPlanRange(
      [task({ dueDate: MONDAY }), task({ dueDate: MONDAY })],
      [MONDAY],
      MONDAY,
      MONDAY,
    );

    const summaries = daySummaries(range.buckets, new Set());

    expect(summaries.get(MONDAY)?.openCount).toBe(range.buckets[0].openCount);
  });

  it("boş kova listesinde boş harita döner", () => {
    expect(daySummaries([], new Set()).size).toBe(0);
  });
});
