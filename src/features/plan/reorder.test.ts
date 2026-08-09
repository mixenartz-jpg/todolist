import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { task } from "@/features/testing/fixtures";
import { applySortOrders, planReorder } from "./reorder";

const DAY = asDateStr("2026-08-03");

/** Ekranda göründüğü sırayla üç görev, numaraları 0-1-2. */
function threeTasks() {
  return [
    task({ id: "a", dueDate: DAY, sortOrder: 0 }),
    task({ id: "b", dueDate: DAY, sortOrder: 1 }),
    task({ id: "c", dueDate: DAY, sortOrder: 2 }),
  ];
}

describe("planReorder", () => {
  it("bir görevi yukarı taşır ve yalnızca değişenleri döner", () => {
    const patches = planReorder(threeTasks(), "b", -1);

    // a ve b yer değiştirir; c yerinde kaldığı için yazılmaz.
    expect(patches).toEqual([
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
    ]);
  });

  it("bir görevi aşağı taşır", () => {
    const patches = planReorder(threeTasks(), "b", 1);

    expect(patches).toEqual([
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });

  it("yalnızca iki komşu yer değiştirir, aradakiler kaymaz", () => {
    const tasks = [
      ...threeTasks(),
      task({ id: "d", dueDate: DAY, sortOrder: 3 }),
    ];
    const patches = planReorder(tasks, "c", -1);

    expect(patches.map((p) => p.id).sort()).toEqual(["b", "c"]);
  });

  it("ilk görev yukarı taşınamaz", () => {
    expect(planReorder(threeTasks(), "a", -1)).toEqual([]);
  });

  it("son görev aşağı taşınamaz", () => {
    expect(planReorder(threeTasks(), "c", 1)).toEqual([]);
  });

  it("listede olmayan id boş döner", () => {
    expect(planReorder(threeTasks(), "yok", 1)).toEqual([]);
  });

  it("tek görevlü listede hiçbir yön çalışmaz", () => {
    const one = [task({ id: "tek", dueDate: DAY, sortOrder: 0 })];
    expect(planReorder(one, "tek", -1)).toEqual([]);
    expect(planReorder(one, "tek", 1)).toEqual([]);
  });

  it("boş listede çökmez", () => {
    expect(planReorder([], "a", 1)).toEqual([]);
  });

  it("girdi dizisini DEĞİŞTİRMEZ", () => {
    // Yerinde takas kopya üzerinde yapılmalı; önbellekteki diziyi
    // bozmak React Query'nin anlık görüntüsünü de bozardı.
    const tasks = threeTasks();
    planReorder(tasks, "b", -1);

    expect(tasks.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("numaraları hepsi 0 olan günü baştan numaralar", () => {
    // `sort_order` bugüne kadar hiç yazılmadı; ilk taşımada tüm gün
    // düzgün numara almalı.
    const flat = [
      task({ id: "a", dueDate: DAY, sortOrder: 0 }),
      task({ id: "b", dueDate: DAY, sortOrder: 0 }),
      task({ id: "c", dueDate: DAY, sortOrder: 0 }),
    ];
    const patches = planReorder(flat, "c", -1);

    expect(patches).toEqual([
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });
});

describe("applySortOrders", () => {
  it("yamalanan görevlerin sortOrder'ını günceller", () => {
    const result = applySortOrders(threeTasks(), [
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
    ]);

    expect(result.find((t) => t.id === "b")?.sortOrder).toBe(0);
    expect(result.find((t) => t.id === "a")?.sortOrder).toBe(1);
  });

  it("listeyi YENİDEN SIRALAR", () => {
    // Asıl mesele: yalnızca alan yamalansaydı ekranda hiçbir şey
    // kıpırdamaz, sunucu cevabı gelince satır aniden zıplardı.
    const result = applySortOrders(threeTasks(), [
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
    ]);

    expect(result.map((t) => t.id)).toEqual(["b", "a", "c"]);
  });

  it("tamamlanmışları sona atar", () => {
    const tasks = [
      task({ id: "biten", dueDate: DAY, done: true, sortOrder: 0 }),
      task({ id: "acik", dueDate: DAY, done: false, sortOrder: 1 }),
    ];
    const result = applySortOrders(tasks, [{ id: "acik", sortOrder: 0 }]);

    expect(result.map((t) => t.id)).toEqual(["acik", "biten"]);
  });

  it("tarihsizleri sona atar", () => {
    // Sunucu `nullsFirst: false` ile sıralıyor; iyimser sıra da öyle
    // olmalı, yoksa liste iki kez yerleşir.
    const tasks = [
      task({ id: "tarihsiz", dueDate: null, sortOrder: 0 }),
      task({ id: "tarihli", dueDate: DAY, sortOrder: 1 }),
    ];
    const result = applySortOrders(tasks, [{ id: "tarihli", sortOrder: 0 }]);

    expect(result.map((t) => t.id)).toEqual(["tarihli", "tarihsiz"]);
  });

  it("farklı günleri tarihe göre sıralar", () => {
    const later = asDateStr("2026-08-05");
    const tasks = [
      task({ id: "sonraki", dueDate: later, sortOrder: 0 }),
      task({ id: "onceki", dueDate: DAY, sortOrder: 1 }),
    ];
    const result = applySortOrders(tasks, [{ id: "onceki", sortOrder: 0 }]);

    expect(result.map((t) => t.id)).toEqual(["onceki", "sonraki"]);
  });

  it("her şey eşitken id ile deterministik sıralar", () => {
    // Kararlı bir sıra şart: aksi halde liste her yeniden çizimde
    // yer değiştirebilirdi.
    const tasks = [
      task({ id: "b", dueDate: DAY, sortOrder: 0 }),
      task({ id: "a", dueDate: DAY, sortOrder: 0 }),
    ];
    const result = applySortOrders(tasks, [{ id: "b", sortOrder: 0 }]);

    expect(result.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("boş yama listesi sırayı değiştirmez", () => {
    const tasks = threeTasks();
    const result = applySortOrders(tasks, []);

    expect(result.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("girdi dizisini DEĞİŞTİRMEZ", () => {
    const tasks = threeTasks();
    applySortOrders(tasks, [
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
    ]);

    expect(tasks.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(tasks[0].sortOrder).toBe(0);
  });
});
