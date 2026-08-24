import { describe, expect, it } from "vitest";
import { planGoal } from "@/features/testing/fixtures";
import { goalPickerOptions } from "./goaloptions";

describe("goalPickerOptions", () => {
  it("yalnızca etkin hedefleri listeler", () => {
    const a = planGoal({ id: "g1" });
    const b = planGoal({ id: "g2", archivedAt: "2026-08-01T00:00:00Z" });

    const result = goalPickerOptions([a, b], null);

    expect(result.options.map((g) => g.id)).toEqual(["g1"]);
    expect(result.orphan).toBe(false);
    expect(result.current).toBeNull();
  });

  it("seçili ARŞİVLİ hedefi listeye geri ekler", () => {
    // Yoksa tarayıcı ilk seçeneğe düşer ve kullanıcının bağı sessizce
    // değişmiş gibi görünürdü.
    const a = planGoal({ id: "g1" });
    const archived = planGoal({ id: "g2", archivedAt: "2026-08-01T00:00:00Z" });

    const result = goalPickerOptions([a, archived], "g2");

    expect(result.options.map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(result.orphan).toBe(false);
    expect(result.current?.id).toBe("g2");
  });

  it("bağ listede HİÇ yoksa yetim sayılır", () => {
    // Görev bağlandıktan sonra başka bir aya taşınmış: o ayın
    // hedefleri arasında bu kimlik yok.
    const result = goalPickerOptions([planGoal({ id: "g1" })], "baska-ay");

    expect(result.orphan).toBe(true);
    expect(result.current).toBeNull();
    // Yetim bağ listeye SAHTE bir hedef olarak eklenmez; ayrı temsil
    // edilir çünkü adı ve rengi bilinmiyor.
    expect(result.options.map((g) => g.id)).toEqual(["g1"]);
  });

  it("hiç hedef yokken bağ varsa yine yetim sayılır", () => {
    const result = goalPickerOptions([], "baska-ay");

    expect(result.orphan).toBe(true);
    expect(result.options).toEqual([]);
  });

  it("bağ yokken yetim de yoktur", () => {
    expect(goalPickerOptions([], null).orphan).toBe(false);
  });
});
