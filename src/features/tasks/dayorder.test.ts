import { describe, expect, test } from "vitest";
import { task } from "@/features/testing/fixtures";
import { applySortOrders, planReorder } from "@/features/planlama/reorder";
import { orderForDay } from "./dayorder";

const DAY = "2026-08-24";

describe("orderForDay", () => {
  test("sortOrder'a göre sıralar", () => {
    const a = task({ id: "a", dueDate: DAY, sortOrder: 2 });
    const b = task({ id: "b", dueDate: DAY, sortOrder: 0 });
    const c = task({ id: "c", dueDate: DAY, sortOrder: 1 });

    expect(orderForDay([a, b, c]).map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  test("eşit sortOrder'da id ile bozar — deterministik", () => {
    const x = task({ id: "x", dueDate: DAY, sortOrder: 0 });
    const y = task({ id: "y", dueDate: DAY, sortOrder: 0 });

    expect(orderForDay([y, x]).map((t) => t.id)).toEqual(["x", "y"]);
    expect(orderForDay([x, y]).map((t) => t.id)).toEqual(["x", "y"]);
  });

  test("girdiyi DEĞİŞTİRMEZ", () => {
    const a = task({ id: "a", dueDate: DAY, sortOrder: 1 });
    const b = task({ id: "b", dueDate: DAY, sortOrder: 0 });
    const input = [a, b];

    orderForDay(input);

    expect(input.map((t) => t.id)).toEqual(["a", "b"]);
  });

  test("tamamlanan görev YERİNDE kalır, dibe düşmez", () => {
    // Bir görevi işaretlemek onu listenin sonuna atsaydı, kullanıcı
    // hangisini işaretlediğini kaybederdi.
    const a = task({ id: "a", dueDate: DAY, sortOrder: 0, done: true });
    const b = task({ id: "b", dueDate: DAY, sortOrder: 1 });

    expect(orderForDay([a, b]).map((t) => t.id)).toEqual(["a", "b"]);
  });

  test("boş liste boş döner", () => {
    expect(orderForDay([])).toEqual([]);
  });
});

/*
 * INVARIANT — bu testin var olma sebebi.
 *
 * Ekranın çizdiği sırayı `orderForDay`, sıra düğmesinin iyimser
 * güncellemesini `applySortOrders` üretiyor. İkisi ayrışırsa satır
 * basınca doğru yere gider, sunucu cevabıyla başka yere zıplar —
 * hiçbir derleme ya da çalışma zamanı hatası vermeden.
 *
 * ── Neden boş yama listesiyle karşılaştırılmıyor? ──
 * `applySortOrders(tasks, [])` erken döner ve girdiyi OLDUĞU GİBİ
 * verir; sıralamaz. Bu bilinçli: yama yoksa değişen bir şey de yoktur
 * ve listeyi yeniden dizmek gereksiz iş olurdu. Karşılaştırma bu
 * yüzden GERÇEK bir sıra değişimi üzerinden yapılır — zaten ayrışmanın
 * kullanıcıya görüneceği tek an da odur.
 */
describe("orderForDay ↔ applySortOrders tutarlılığı", () => {
  test("sıra değişiminden sonra iki fonksiyon AYNI sırayı verir", () => {
    const tasks = orderForDay([
      task({ id: "a", dueDate: DAY, sortOrder: 0 }),
      task({ id: "b", dueDate: DAY, sortOrder: 1 }),
      task({ id: "c", dueDate: DAY, sortOrder: 2 }),
    ]);

    // "b"yi yukarı taşı → beklenen: a ile yer değiştirir.
    const patches = planReorder(tasks, "b", -1);
    const optimistic = applySortOrders(tasks, patches);

    expect(optimistic.map((t) => t.id)).toEqual(["b", "a", "c"]);
    // Ekran aynı listeyi kendi kuralıyla çizince de aynı sırayı vermeli.
    expect(orderForDay(optimistic).map((t) => t.id)).toEqual(["b", "a", "c"]);
  });

  test("aşağı taşımada da ayrışmaz", () => {
    const tasks = orderForDay([
      task({ id: "a", dueDate: DAY, sortOrder: 0 }),
      task({ id: "b", dueDate: DAY, sortOrder: 1 }),
      task({ id: "c", dueDate: DAY, sortOrder: 2 }),
    ]);

    const optimistic = applySortOrders(tasks, planReorder(tasks, "a", 1));

    expect(optimistic.map((t) => t.id)).toEqual(["b", "a", "c"]);
    expect(orderForDay(optimistic).map((t) => t.id)).toEqual(["b", "a", "c"]);
  });

  /*
   * Art arda iki taşıma: iyimser sıra birikimli olarak doğru kalmalı.
   * Tek adımda doğru olup ikincisinde ayrışan bir hata, elle test
   * ederken en kolay kaçırılan türdendir.
   */
  test("art arda taşımalarda birikimli olarak tutarlı kalır", () => {
    let tasks = orderForDay([
      task({ id: "a", dueDate: DAY, sortOrder: 0 }),
      task({ id: "b", dueDate: DAY, sortOrder: 1 }),
      task({ id: "c", dueDate: DAY, sortOrder: 2 }),
    ]);

    tasks = applySortOrders(tasks, planReorder(tasks, "c", -1)); // a, c, b
    expect(tasks.map((t) => t.id)).toEqual(["a", "c", "b"]);

    tasks = applySortOrders(tasks, planReorder(tasks, "c", -1)); // c, a, b
    expect(tasks.map((t) => t.id)).toEqual(["c", "a", "b"]);

    expect(orderForDay(tasks).map((t) => t.id)).toEqual(["c", "a", "b"]);
  });
});
