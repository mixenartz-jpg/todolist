import { describe, expect, it } from "vitest";
import { task } from "@/features/testing/fixtures";
import { filterByCategory, filterByGoal } from "./filter";

describe("filterByCategory", () => {
  it("filtre yokken AYNI dizi referansını döner", () => {
    const tasks = [task({ categoryId: "c1" }), task({ categoryId: null })];

    /*
     * Referans eşitliği asıl korunan davranış: çağıran taraf sonucu
     * `useMemo` bağımlısı olarak kullanıyor. Yeni dizi dönseydi ızgara
     * her render'da yeniden hesaplanır ve önbellek hiç tutmazdı.
     */
    expect(filterByCategory(tasks, null)).toBe(tasks);
  });

  it("verilen kategoriye ait görevleri süzer", () => {
    const tasks = [
      task({ id: "a", categoryId: "mat" }),
      task({ id: "b", categoryId: "spor" }),
      task({ id: "c", categoryId: "mat" }),
      task({ id: "d", categoryId: null }),
    ];

    expect(filterByCategory(tasks, "mat").map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("'none' YALNIZCA kategorisizleri döner", () => {
    const tasks = [
      task({ id: "a", categoryId: "mat" }),
      task({ id: "b", categoryId: null }),
      task({ id: "c", categoryId: null }),
    ];

    // "filtre yok" ile "etiketlemediklerimi göster" farklı isteklerdir;
    // bu ayrım `null` ve `"none"` ile ifade edilir.
    expect(filterByCategory(tasks, "none").map((t) => t.id)).toEqual(["b", "c"]);
  });

  it("eşleşme yoksa boş dizi döner, hata vermez", () => {
    expect(filterByCategory([task({ categoryId: "mat" })], "yok")).toEqual([]);
  });

  it("arşivlenmiş kategorinin görevleri de süzülür", () => {
    // Arşiv bir GÖRÜNÜRLÜK kararıdır (seçim listesinde çıkmaz), veri
    // kararı değil: geçmiş görevler kategorilerini korur ve
    // filtrelenebilir olmaya devam eder.
    const tasks = [task({ id: "a", categoryId: "eski" })];
    expect(filterByCategory(tasks, "eski").map((t) => t.id)).toEqual(["a"]);
  });
});

describe("filterByGoal", () => {
  it("filtre yokken AYNI dizi referansını döner", () => {
    const tasks = [task({ goalId: "g1" })];
    expect(filterByGoal(tasks, null)).toBe(tasks);
  });

  it("verilen hedefe bağlı görevleri süzer", () => {
    const tasks = [
      task({ id: "a", goalId: "g1" }),
      task({ id: "b", goalId: "g2" }),
      task({ id: "c", goalId: null }),
    ];

    expect(filterByGoal(tasks, "g1").map((t) => t.id)).toEqual(["a"]);
  });

  it("tarihsiz görev de hedefe bağlıysa gelir", () => {
    // Hedef AYA aittir ama ona bağlı görev tarihsiz olabilir ("bir ara
    // yapacağım ama bu ay bitirmek istiyorum").
    const tasks = [task({ id: "a", dueDate: null, goalId: "g1" })];
    expect(filterByGoal(tasks, "g1").map((t) => t.id)).toEqual(["a"]);
  });
});
