import { describe, expect, test } from "vitest";
import { task } from "@/features/testing/fixtures";
import { orderForList } from "./listorder";

/** Test okunurluğu: sonuçtan yalnızca kimlikleri al. */
function ids(tasks: ReturnType<typeof orderForList>) {
  return tasks.map((t) => t.id);
}

describe("orderForList", () => {
  test("boş girdi boş sonuç verir", () => {
    expect(orderForList([])).toEqual([]);
  });

  test("saatli görevler saate göre artan sıralanır", () => {
    const out = orderForList([
      task({ id: "gec", startTime: "14:00" }),
      task({ id: "erken", startTime: "09:00" }),
      task({ id: "orta", startTime: "11:30" }),
    ]);
    expect(ids(out)).toEqual(["erken", "orta", "gec"]);
  });

  test("saatsizler saatlilerin ARDINDAN gelir", () => {
    // Girdide saatsiz önce duruyor; çıktıda sona düşmeli.
    const out = orderForList([
      task({ id: "saatsiz" }),
      task({ id: "saatli", startTime: "09:00" }),
    ]);
    expect(ids(out)).toEqual(["saatli", "saatsiz"]);
  });

  test("saatsizler kendi aralarında sortOrder sırasını korur", () => {
    const out = orderForList([
      task({ id: "b", sortOrder: 1 }),
      task({ id: "a", sortOrder: 0 }),
    ]);
    // splitDaySchedule saatsizleri YENİDEN sıralamaz; girdi sırası korunur.
    expect(ids(out)).toEqual(["b", "a"]);
  });

  test("aynı saatteki görevler deterministik sıralanır", () => {
    // Eşitlik sortOrder, sonra id ile bozulur — her çizimde aynı sıra.
    const out = orderForList([
      task({ id: "z", startTime: "09:00", sortOrder: 5 }),
      task({ id: "a", startTime: "09:00", sortOrder: 1 }),
      task({ id: "m", startTime: "09:00", sortOrder: 1 }),
    ]);
    expect(ids(out)).toEqual(["a", "m", "z"]);
  });

  test("geçersiz saat saatsiz sayılır", () => {
    // parseTime null dönerse görev kaybolmaz, saatsiz grubuna düşer.
    const out = orderForList([
      task({ id: "bozuk", startTime: "25:99" }),
      task({ id: "saatli", startTime: "09:00" }),
    ]);
    expect(ids(out)).toEqual(["saatli", "bozuk"]);
  });

  test("girdi dizisini değiştirmez", () => {
    const input = [
      task({ id: "b", startTime: "14:00" }),
      task({ id: "a", startTime: "09:00" }),
    ];
    orderForList(input);
    expect(ids(input)).toEqual(["b", "a"]);
  });
});
