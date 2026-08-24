import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { planGoal } from "@/features/testing/fixtures";
import type { WeekGoal } from "./types";
import { weekSlicesByGoal } from "./weekchain";

function weekGoal(options: Partial<WeekGoal> & { id: string }): WeekGoal {
  return {
    weekStart: asDateStr("2026-08-24"),
    title: "Test hedefi",
    note: null,
    targetCount: null,
    doneCount: 0,
    colorSlot: 0,
    sortOrder: 0,
    completedAt: null,
    planGoalId: null,
    ...options,
  };
}

describe("weekSlicesByGoal", () => {
  it("boş girdide boş harita", () => {
    expect(weekSlicesByGoal([]).size).toBe(0);
  });

  it("bağımsız hafta hedeflerini HİÇ gruplamaz", () => {
    // planGoalId null → hiçbir aylık hedefin dilimi değil.
    const map = weekSlicesByGoal([
      weekGoal({ id: "w1" }),
      weekGoal({ id: "w2" }),
    ]);

    expect(map.size).toBe(0);
  });

  it("aynı aylık hedefin dilimlerini toplar", () => {
    const map = weekSlicesByGoal([
      weekGoal({ id: "w1", planGoalId: "g1" }),
      weekGoal({ id: "w2", planGoalId: "g1" }),
      weekGoal({ id: "w3", planGoalId: "g2" }),
    ]);

    expect(map.get("g1")?.map((w) => w.id)).toEqual(["w1", "w2"]);
    expect(map.get("g2")?.map((w) => w.id)).toEqual(["w3"]);
  });

  it("hafta sırasını KORUR — girdi sırası çıktı sırasıdır", () => {
    // Ekran hedefleri kendi sırasıyla çiziyor; gruplama o sırayı
    // bozarsa kullanıcı listeyi tanıyamaz.
    const map = weekSlicesByGoal([
      weekGoal({ id: "w2", planGoalId: "g1", sortOrder: 1 }),
      weekGoal({ id: "w1", planGoalId: "g1", sortOrder: 0 }),
    ]);

    expect(map.get("g1")?.map((w) => w.id)).toEqual(["w2", "w1"]);
  });

  it("tamamlanan dilimleri de içerir", () => {
    // Tamamlanan hedef listeden kalkmaz (0011); zincirde de kalmalı,
    // yoksa "bu ay hedefe ne kadar yaklaştım" sorusu eksik cevaplanır.
    const map = weekSlicesByGoal([
      weekGoal({
        id: "w1",
        planGoalId: "g1",
        completedAt: "2026-08-25T10:00:00Z",
      }),
    ]);

    expect(map.get("g1")).toHaveLength(1);
  });
});

describe("weekSlicesByGoal — aylık hedefle birlikte", () => {
  it("silinmiş aylık hedefin dilimi haritada kalır ama eşleşmez", () => {
    // `on delete set null` sayesinde bu durum normalde OLUŞMAZ: aylık
    // hedef silinince planGoalId null olur. Test, haritanın yalnızca
    // kimlik eşlemesi yaptığını ve var olmayan bir kimliğin sessizce
    // kaybolmadığını sabitler.
    const goal = planGoal({ id: "g1" });
    const map = weekSlicesByGoal([
      weekGoal({ id: "w1", planGoalId: "silinmis" }),
    ]);

    expect(map.get(goal.id)).toBeUndefined();
    expect(map.get("silinmis")).toHaveLength(1);
  });
});
