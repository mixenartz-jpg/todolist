import { describe, expect, it } from "vitest";
import { goalNode, planGoal, task } from "@/features/testing/fixtures";
import { goalProgress } from "./rollup";
import { goalMeasure } from "./goalmeasure";

describe("goalMeasure — öncelik sırası", () => {
  it("ağaç varsa SAYISAL HEDEFİ yener", () => {
    // Kullanıcının kararı: bir hedefe ağaç kurulduğu anda kart da
    // ağaçtan okur. Tek sayı, tek gerçek.
    const goal = planGoal({ id: "g1", targetCount: 10, doneCount: 9 });
    const nodes = [goalNode({ id: "a", planGoalId: "g1" })];
    const tasks = [
      task({ nodeId: "a", goalId: "g1", done: true }),
      task({ nodeId: "a", goalId: "g1", done: false }),
    ];

    const measure = goalMeasure(goal, nodes, tasks);

    expect(measure.kind).toBe("tree");
    expect(measure.kind === "tree" && measure.ratio).toBe(0.5);
  });

  it("ağaç varsa ama hiç görev dağıtılmadıysa yine ağaçtan okur — ratio null", () => {
    const goal = planGoal({ id: "g1", targetCount: 10, doneCount: 9 });
    const nodes = [goalNode({ id: "a", planGoalId: "g1" })];

    const measure = goalMeasure(goal, nodes, []);

    expect(measure.kind).toBe("tree");
    expect(measure.kind === "tree" && measure.ratio).toBeNull();
  });

  it("ağaç yoksa sayısal hedeften okur", () => {
    const goal = planGoal({ id: "g1", targetCount: 4, doneCount: 1 });

    expect(goalMeasure(goal, [], [])).toMatchObject({
      kind: "count",
      ratio: 0.25,
    });
  });

  it("ağaç ve sayısal hedef yoksa bağlı görevlerden okur", () => {
    const goal = planGoal({ id: "g1", targetCount: null });
    const tasks = [
      task({ goalId: "g1", done: true }),
      task({ goalId: "g1", done: false }),
    ];

    expect(goalMeasure(goal, [], tasks)).toMatchObject({
      kind: "tasks",
      ratio: 0.5,
    });
  });

  it("hiçbir ölçü yoksa none döner", () => {
    const goal = planGoal({ id: "g1", targetCount: null });

    expect(goalMeasure(goal, [], [])).toEqual({ kind: "none" });
  });
});

describe("goalMeasure — başka hedefin ağacı", () => {
  it("BAŞKA hedefin düğümlerini ağaç saymaz", () => {
    // Ağaç sorgusu hedef başına yapılıyor ama çağıran yanlış listeyi
    // geçirebilir; o zaman hedef sessizce yanlış ölçüye kayardı.
    const goal = planGoal({ id: "g1", targetCount: 4, doneCount: 1 });
    const nodes = [goalNode({ id: "a", planGoalId: "BASKA" })];

    expect(goalMeasure(goal, nodes, [])).toMatchObject({ kind: "count" });
  });
});

describe("goalMeasure — goalProgress ile tutarlılık", () => {
  it("ağaçsız hedefte goalProgress ile AYNI oranı verir", () => {
    const goal = planGoal({ id: "g1", targetCount: null });
    const tasks = [
      task({ goalId: "g1", done: true }),
      task({ goalId: "g1", done: true }),
      task({ goalId: "g1", done: false }),
    ];

    const measure = goalMeasure(goal, [], tasks);
    const legacy = goalProgress(goal, tasks);

    expect(measure.kind === "tasks" && measure.ratio).toBe(legacy.ratio);
  });

  it("sayısal hedefte goalProgress ile AYNI oranı verir", () => {
    const goal = planGoal({ id: "g1", targetCount: 8, doneCount: 2 });

    const measure = goalMeasure(goal, [], []);

    expect(measure.kind === "count" && measure.ratio).toBe(
      goalProgress(goal, []).ratio,
    );
  });

  it("sayısal hedef aşıldığında oran 1'i geçmez", () => {
    const goal = planGoal({ id: "g1", targetCount: 3, doneCount: 9 });

    expect(goalMeasure(goal, [], [])).toMatchObject({ kind: "count", ratio: 1 });
  });
});
