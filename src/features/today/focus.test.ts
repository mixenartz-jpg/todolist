import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { task } from "@/features/testing/fixtures";
import { orderForDay } from "@/features/tasks/dayorder";
import { nextTask, openCount } from "./focus";

const TODAY = asDateStr("2026-08-19");

describe("nextTask", () => {
  it("bugünün ilk açık işini verir", () => {
    const picked = nextTask(
      [
        task({ id: "b", dueDate: TODAY, sortOrder: 1 }),
        task({ id: "a", dueDate: TODAY, sortOrder: 0 }),
      ],
      TODAY,
    );

    expect(picked!.id).toBe("a");
  });

  it("tamamlananları atlar", () => {
    const picked = nextTask(
      [
        task({ id: "a", dueDate: TODAY, sortOrder: 0, done: true }),
        task({ id: "b", dueDate: TODAY, sortOrder: 1 }),
      ],
      TODAY,
    );

    expect(picked!.id).toBe("b");
  });

  /*
   * Taşan iş zaten bir kez ertelenmiş; ikinci kez ertelenmesi onu
   * kalıcı olarak dibe iter.
   */
  it("gecikmişi bugünün işinin ÖNÜNE alır", () => {
    const picked = nextTask(
      [
        task({ id: "bugun", dueDate: TODAY, sortOrder: 0 }),
        task({ id: "dun", dueDate: "2026-08-18", sortOrder: 9 }),
      ],
      TODAY,
    );

    expect(picked!.id).toBe("dun");
  });

  /*
   * İki ayrı günden taşan işlerin `sortOrder`'ları karşılaştırılamaz:
   * her biri kendi gününün sırasını taşıyor ve "0" iki ayrı günde iki
   * ayrı anlama geliyor.
   */
  it("gecikmişler arasında EN ESKİ tarih kazanır", () => {
    const picked = nextTask(
      [
        task({ id: "dun", dueDate: "2026-08-18", sortOrder: 0 }),
        task({ id: "gecenhafta", dueDate: "2026-08-12", sortOrder: 5 }),
      ],
      TODAY,
    );

    expect(picked!.id).toBe("gecenhafta");
  });

  it("aynı gün taşanlarda sortOrder karar verir", () => {
    const picked = nextTask(
      [
        task({ id: "ikinci", dueDate: "2026-08-18", sortOrder: 3 }),
        task({ id: "ilk", dueDate: "2026-08-18", sortOrder: 1 }),
      ],
      TODAY,
    );

    expect(picked!.id).toBe("ilk");
  });

  it("tamamlanmış gecikmiş iş gecikmiş SAYILMAZ", () => {
    // `isOverdue` bitmiş işi taşınmış saymıyor; kart da saymamalı.
    const picked = nextTask(
      [
        task({ id: "dun", dueDate: "2026-08-18", done: true, sortOrder: 0 }),
        task({ id: "bugun", dueDate: TODAY, sortOrder: 5 }),
      ],
      TODAY,
    );

    expect(picked!.id).toBe("bugun");
  });

  it("hiç açık iş yoksa null döner", () => {
    expect(nextTask([], TODAY)).toBeNull();
    expect(
      nextTask([task({ dueDate: TODAY, done: true })], TODAY),
    ).toBeNull();
  });

  /*
   * INVARIANT: kart "sıradaki" diyorsa listede de o görev sırada
   * görünmeli. Gecikmiş olmayan bir günde iki sıralama AYNI başı
   * vermeli — ayrışırsa kart, listenin ortasından rastgele bir işi
   * işaret ediyor olurdu ve bu kullanıcıya hiç açıklanamazdı.
   */
  it("gecikmiş yokken orderForDay'in İLKİYLE aynıdır", () => {
    const tasks = [
      task({ id: "c", dueDate: TODAY, sortOrder: 2 }),
      task({ id: "a", dueDate: TODAY, sortOrder: 0 }),
      task({ id: "b", dueDate: TODAY, sortOrder: 1 }),
    ];

    expect(nextTask(tasks, TODAY)!.id).toBe(orderForDay(tasks)[0].id);
  });
});

describe("openCount", () => {
  it("yalnızca bitmemişleri sayar", () => {
    const count = openCount([
      task({ done: true }),
      task({ done: false }),
      task({ done: false }),
    ]);

    expect(count).toBe(2);
  });

  it("boş listede sıfırdır", () => {
    expect(openCount([])).toBe(0);
  });
});
