import { describe, expect, it } from "vitest";
import {
  keyToAction,
  matrixFocusReducer,
  type FocusPosition,
  type GridBounds,
} from "./keyboard";

// 3 rutin × 31 gün — tipik bir ay
const bounds: GridBounds = { rows: 3, cols: 31 };
const at = (row: number, col: number): FocusPosition => ({ row, col });

const move = (from: FocusPosition, action: Parameters<typeof matrixFocusReducer>[1]) =>
  matrixFocusReducer(from, action, bounds);

describe("yatay hareket", () => {
  it("sağa gider", () => {
    expect(move(at(1, 5), { type: "right" })).toEqual(at(1, 6));
  });

  it("sola gider", () => {
    expect(move(at(1, 5), { type: "left" })).toEqual(at(1, 4));
  });

  it("satır sonunda bir sonraki satırın başına SARAR", () => {
    expect(move(at(0, 30), { type: "right" })).toEqual(at(1, 0));
  });

  it("satır başında bir önceki satırın sonuna SARAR", () => {
    expect(move(at(1, 0), { type: "left" })).toEqual(at(0, 30));
  });

  it("son hücrede sağa gitmek yerinde kalır", () => {
    expect(move(at(2, 30), { type: "right" })).toEqual(at(2, 30));
  });

  it("ilk hücrede sola gitmek yerinde kalır", () => {
    expect(move(at(0, 0), { type: "left" })).toEqual(at(0, 0));
  });
});

describe("dikey hareket", () => {
  it("aşağı iner", () => {
    expect(move(at(0, 5), { type: "down" })).toEqual(at(1, 5));
  });

  it("yukarı çıkar", () => {
    expect(move(at(2, 5), { type: "up" })).toEqual(at(1, 5));
  });

  it("üst kenarda durur, SARMAZ", () => {
    expect(move(at(0, 5), { type: "up" })).toEqual(at(0, 5));
  });

  it("alt kenarda durur, SARMAZ", () => {
    expect(move(at(2, 5), { type: "down" })).toEqual(at(2, 5));
  });

  it("sütunu korur", () => {
    expect(move(at(0, 17), { type: "down" }).col).toBe(17);
  });
});

describe("Home / End", () => {
  it("Home satır başına gider", () => {
    expect(move(at(1, 20), { type: "rowStart" })).toEqual(at(1, 0));
  });

  it("End satır sonuna gider", () => {
    expect(move(at(1, 5), { type: "rowEnd" })).toEqual(at(1, 30));
  });

  it("Ctrl+Home ilk hücreye gider", () => {
    expect(move(at(2, 20), { type: "gridStart" })).toEqual(at(0, 0));
  });

  it("Ctrl+End son hücreye gider", () => {
    expect(move(at(0, 3), { type: "gridEnd" })).toEqual(at(2, 30));
  });
});

describe("toColumn — bugüne atla / ay değiştir", () => {
  it("satırı koruyarak sütuna gider", () => {
    expect(move(at(2, 5), { type: "toColumn", col: 17 })).toEqual(at(2, 17));
  });

  it("sınır dışı sütunu kırpar", () => {
    // 31 günlük aydan 28 günlüğe geçerken 30. gün yoktur
    expect(move(at(1, 5), { type: "toColumn", col: 99 })).toEqual(at(1, 30));
    expect(move(at(1, 5), { type: "toColumn", col: -3 })).toEqual(at(1, 0));
  });
});

describe("sınır kırpma", () => {
  it("sınır dışı state'i kırparak işler", () => {
    expect(move(at(99, 99), { type: "left" })).toEqual(at(2, 29));
  });

  it("negatif state'i kırpar", () => {
    expect(move(at(-5, -5), { type: "right" })).toEqual(at(0, 1));
  });

  it("set eylemi konumu kırpar", () => {
    expect(move(at(0, 0), { type: "set", position: at(50, 50) })).toEqual(at(2, 30));
  });
});

describe("boş grid", () => {
  it("rutin yokken state'i değiştirmez", () => {
    const empty: GridBounds = { rows: 0, cols: 31 };
    expect(matrixFocusReducer(at(0, 0), { type: "down" }, empty)).toEqual(at(0, 0));
  });
});

describe("ay geçişi — daha kısa aya geçerken", () => {
  it("Şubat'a geçişte 31. günde duran odak kırpılır", () => {
    const february: GridBounds = { rows: 3, cols: 28 };
    expect(
      matrixFocusReducer(at(1, 30), { type: "toColumn", col: 30 }, february),
    ).toEqual(at(1, 27));
  });
});

describe("keyToAction", () => {
  const plain = { ctrl: false, meta: false };

  it("ok tuşlarını eşler", () => {
    expect(keyToAction("ArrowLeft", plain)).toEqual({ type: "left" });
    expect(keyToAction("ArrowRight", plain)).toEqual({ type: "right" });
    expect(keyToAction("ArrowUp", plain)).toEqual({ type: "up" });
    expect(keyToAction("ArrowDown", plain)).toEqual({ type: "down" });
  });

  it("Home/End satır sınırlarına eşler", () => {
    expect(keyToAction("Home", plain)).toEqual({ type: "rowStart" });
    expect(keyToAction("End", plain)).toEqual({ type: "rowEnd" });
  });

  it("Ctrl ile grid sınırlarına eşler", () => {
    expect(keyToAction("Home", { ctrl: true, meta: false })).toEqual({
      type: "gridStart",
    });
    expect(keyToAction("End", { ctrl: false, meta: true })).toEqual({
      type: "gridEnd",
    });
  });

  it("veri tuşlarını yok sayar (bileşende ele alınır)", () => {
    expect(keyToAction(" ", plain)).toBeNull();
    expect(keyToAction("Enter", plain)).toBeNull();
    expect(keyToAction("5", plain)).toBeNull();
    expect(keyToAction("Backspace", plain)).toBeNull();
  });
});
