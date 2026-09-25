import { describe, expect, it } from "vitest";
import { goalNode, planGoal, task } from "@/features/testing/fixtures";
import { goalProgress } from "./rollup";
import {
  goalTreeProgress,
  nodeDispatch,
  sentTasksByNode,
  treeRootRatio,
} from "./nodeprogress";

/** Bir düğüme bağlı n görev üretir, ilk `done` tanesi tamamlanmış. */
function tasksFor(nodeId: string, total: number, done: number) {
  return Array.from({ length: total }, (_, i) =>
    task({ id: `${nodeId}-t${i}`, nodeId, goalId: "g1", done: i < done }),
  );
}

describe("goalTreeProgress — yaprak düğüm", () => {
  it("bağlı görevlerinden oran okur", () => {
    const nodes = [goalNode({ id: "a" })];
    const progress = goalTreeProgress(nodes, tasksFor("a", 4, 1));

    expect(progress.get("a")).toMatchObject({
      taskTotal: 4,
      taskDone: 1,
      ratio: 0.25,
      source: "tasks",
      leaf: true,
    });
  });

  it("görevi olmayan yaprakta null döner — 0 DEĞİL", () => {
    const progress = goalTreeProgress([goalNode({ id: "a" })], []);

    // `0` "hiç başlamadın" der; doğrusu "henüz dağıtılmadı, ölçülmüyor".
    // Arayüz bu ikisini farklı çizer (GoalProgress.ratio ile aynı kural).
    expect(progress.get("a")).toMatchObject({
      ratio: null,
      source: "none",
      taskTotal: 0,
    });
  });

  it("başka düğümün görevlerini saymaz", () => {
    const nodes = [goalNode({ id: "a" }), goalNode({ id: "b" })];
    const progress = goalTreeProgress(nodes, tasksFor("b", 2, 2));

    expect(progress.get("a")?.taskTotal).toBe(0);
    expect(progress.get("b")?.taskTotal).toBe(2);
  });

  it("düğümsüz görevleri saymaz", () => {
    const progress = goalTreeProgress(
      [goalNode({ id: "a" })],
      [task({ goalId: "g1", done: true })],
    );

    expect(progress.get("a")?.taskTotal).toBe(0);
  });
});

describe("goalTreeProgress — üst düğüm toplama kuralı", () => {
  /**
   * BU MODÜLÜN ASIL KONUSU.
   *
   * "Kimya"nın iki çocuğu: biri 1 görevle bitmiş, diğeri 20 görevle
   * hiç başlanmamış. Çocuk ortalaması %50 derdi ve kullanıcı haftasını
   * yarı yolda sanarak planlardı. Alt ağacın toplamı %4.8 diyor.
   */
  it("ebeveyn oranı alt ağacın TOPLAM görevinden okunur, çocuk ortalamasından DEĞİL", () => {
    const nodes = [
      goalNode({ id: "kimya" }),
      goalNode({ id: "asit", parentId: "kimya", depth: 2 }),
      goalNode({ id: "organik", parentId: "kimya", depth: 2 }),
    ];
    const tasks = [...tasksFor("asit", 1, 1), ...tasksFor("organik", 20, 0)];

    const kimya = goalTreeProgress(nodes, tasks).get("kimya");

    expect(kimya).toMatchObject({ taskTotal: 21, taskDone: 1, source: "rollup" });
    expect(kimya?.ratio).toBeCloseTo(1 / 21, 5);
    // Çocuk ortalaması olsaydı 0.5 çıkardı.
    expect(kimya?.ratio).not.toBeCloseTo(0.5, 2);
  });

  it("üç seviyenin tamamını toplar", () => {
    const nodes = [
      goalNode({ id: "kimya" }),
      goalNode({ id: "asit", parentId: "kimya", depth: 2 }),
      goalNode({ id: "bank", parentId: "asit", depth: 3 }),
    ];
    const tasks = [...tasksFor("asit", 2, 1), ...tasksFor("bank", 4, 3)];

    expect(goalTreeProgress(nodes, tasks).get("kimya")).toMatchObject({
      taskTotal: 6,
      taskDone: 4,
    });
  });

  it("ara düğümün KENDİ görevleri de sayılır", () => {
    // Bir ara düğüm de güne gönderilebilir; onun görevleri alt
    // ağacın toplamına girmeliydi, yoksa sayı kullanıcının ekranda
    // gördüğü görevlerden az çıkardı.
    const nodes = [
      goalNode({ id: "kimya" }),
      goalNode({ id: "asit", parentId: "kimya", depth: 2 }),
    ];
    const tasks = [...tasksFor("kimya", 1, 1), ...tasksFor("asit", 1, 0)];

    expect(goalTreeProgress(nodes, tasks).get("kimya")).toMatchObject({
      taskTotal: 2,
      taskDone: 1,
    });
  });

  it("alt ağacında hiç görev yoksa null döner", () => {
    const nodes = [
      goalNode({ id: "kimya" }),
      goalNode({ id: "asit", parentId: "kimya", depth: 2 }),
    ];

    expect(goalTreeProgress(nodes, []).get("kimya")).toMatchObject({
      ratio: null,
      source: "none",
    });
  });

  it("çocuğu olanı leaf: false ile işaretler", () => {
    const nodes = [
      goalNode({ id: "kimya" }),
      goalNode({ id: "asit", parentId: "kimya", depth: 2 }),
    ];
    const progress = goalTreeProgress(nodes, []);

    expect(progress.get("kimya")?.leaf).toBe(false);
    expect(progress.get("asit")?.leaf).toBe(true);
  });

  it("her düğüm için bir girdi döner", () => {
    const nodes = [
      goalNode({ id: "a" }),
      goalNode({ id: "b", parentId: "a", depth: 2 }),
      goalNode({ id: "c" }),
    ];

    expect([...goalTreeProgress(nodes, []).keys()].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("treeRootRatio", () => {
  it("tüm ağacın görevlerinden tek oran verir", () => {
    const nodes = [
      goalNode({ id: "a" }),
      goalNode({ id: "b", parentId: "a", depth: 2 }),
      goalNode({ id: "c" }),
    ];
    const tasks = [...tasksFor("b", 2, 1), ...tasksFor("c", 2, 0)];

    expect(treeRootRatio(goalTreeProgress(nodes, tasks), nodes)).toBe(0.25);
  });

  it("hiç görev yoksa null döner", () => {
    const nodes = [goalNode({ id: "a" })];

    expect(treeRootRatio(goalTreeProgress(nodes, []), nodes)).toBeNull();
  });

  it("boş ağaçta null döner", () => {
    expect(treeRootRatio(goalTreeProgress([], []), [])).toBeNull();
  });

  it("aynı görevi iki kez saymaz — kök toplamı görev sayısını aşmaz", () => {
    // Çift sayım bu modülün en sinsi hata biçimi: ebeveyn hem kendi
    // görevini hem çocuğununkini sayarken, kök toplamı çocuğun
    // görevlerini bir kez daha eklerse oran 1'i aşar.
    const nodes = [
      goalNode({ id: "a" }),
      goalNode({ id: "b", parentId: "a", depth: 2 }),
      goalNode({ id: "c", parentId: "b", depth: 3 }),
    ];
    const tasks = [...tasksFor("a", 1, 1), ...tasksFor("b", 1, 1), ...tasksFor("c", 1, 1)];

    expect(treeRootRatio(goalTreeProgress(nodes, tasks), nodes)).toBe(1);
  });
});

describe("goalProgress ile tutarlılık", () => {
  it("kök oranı, sayısal hedefi olmayan hedefin goalProgress oranıyla aynı", () => {
    // Ağaçtan doğan görev hem goalId hem nodeId taşır (0022). İki
    // okuma aynı görev kümesini görüyor; sayılar ayrışırsa hedef
    // kartı ile ağaç sayfası birbirini yalanlar.
    const goal = planGoal({ id: "g1", targetCount: null });
    const nodes = [
      goalNode({ id: "a", planGoalId: "g1" }),
      goalNode({ id: "b", parentId: "a", planGoalId: "g1", depth: 2 }),
    ];
    const tasks = [...tasksFor("a", 3, 2), ...tasksFor("b", 1, 0)];

    const fromTree = treeRootRatio(goalTreeProgress(nodes, tasks), nodes);
    const fromGoal = goalProgress(goal, tasks).ratio;

    expect(fromTree).toBe(fromGoal);
  });
});

describe("sentTasksByNode", () => {
  it("görevleri kalemine göre gruplar, kalemsizleri atlar", () => {
    const map = sentTasksByNode([
      task({ id: "a", nodeId: "n1", dueDate: "2026-09-26" }),
      task({ id: "b", nodeId: "n2", dueDate: "2026-09-25" }),
      task({ id: "c", nodeId: null, dueDate: "2026-09-25" }),
    ]);
    expect([...map.keys()].sort()).toEqual(["n1", "n2"]);
    expect(map.get("n1")!.map((t) => t.id)).toEqual(["a"]);
  });

  it("tarihe göre sıralar, tarihsizler sonda", () => {
    const map = sentTasksByNode([
      task({ id: "x", nodeId: "n1", dueDate: null }),
      task({ id: "late", nodeId: "n1", dueDate: "2026-10-02" }),
      task({ id: "early", nodeId: "n1", dueDate: "2026-09-26" }),
    ]);
    expect(map.get("n1")!.map((t) => t.id)).toEqual(["early", "late", "x"]);
  });

  it("çocukların görevleri ataya TOPLANMAZ", () => {
    const map = sentTasksByNode([task({ id: "c1", nodeId: "child" })]);
    expect(map.has("parent")).toBe(false);
  });
});

describe("nodeDispatch", () => {
  const parent = goalNode({ id: "p", title: "Logaritma" });
  const a = goalNode({ id: "a", parentId: "p", sortOrder: 0 });
  const b = goalNode({ id: "b", parentId: "p", sortOrder: 1 });
  const nodes = [parent, a, b];

  it("görevi olmayan kalem gönderilmemiştir", () => {
    const map = nodeDispatch(nodes, []);
    expect(map.get("a")).toEqual({ state: "none", day: null });
    expect(map.get("p")).toEqual({ state: "none", day: null });
  });

  it("gönderilen kalem en erken bitmemiş günü taşır", () => {
    const map = nodeDispatch(nodes, [
      task({ nodeId: "a", dueDate: "2026-09-29" }),
      task({ nodeId: "a", dueDate: "2026-09-26" }),
      task({ nodeId: "a", dueDate: "2026-09-24", done: true }),
    ]);
    expect(map.get("a")).toEqual({ state: "sent", day: "2026-09-26" });
  });

  it("görevlerinin hepsi bitmişse done", () => {
    const map = nodeDispatch(nodes, [task({ nodeId: "a", dueDate: "2026-09-24", done: true })]);
    expect(map.get("a")!.state).toBe("done");
  });

  it("üst başlık tek çocuk gönderildi diye çizilmez", () => {
    const map = nodeDispatch(nodes, [task({ nodeId: "a", dueDate: "2026-09-26" })]);
    expect(map.get("p")!.state).toBe("none");
  });

  it("bütün çocuklar gönderilince üst başlık da gönderilmiştir", () => {
    const map = nodeDispatch(nodes, [
      task({ nodeId: "a", dueDate: "2026-09-28" }),
      task({ nodeId: "b", dueDate: "2026-09-26", done: true }),
    ]);
    expect(map.get("p")).toEqual({ state: "sent", day: "2026-09-28" });
  });

  it("bütün çocuklar bitince üst başlık done", () => {
    const map = nodeDispatch(nodes, [
      task({ nodeId: "a", done: true }),
      task({ nodeId: "b", done: true }),
    ]);
    expect(map.get("p")!.state).toBe("done");
  });

  it("başlığın kendisi gönderildiyse çocuklara bakılmaz", () => {
    const map = nodeDispatch(nodes, [task({ nodeId: "p", dueDate: "2026-09-27" })]);
    expect(map.get("p")).toEqual({ state: "sent", day: "2026-09-27" });
  });
});
