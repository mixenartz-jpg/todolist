import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAP,
  DEFAULT_MARGIN,
  placePopover,
  type AnchorInput,
} from "./anchor";

/** Masaüstü viewport'unda, ekranın solunda duran bir blok. */
const DESKTOP: AnchorInput = {
  anchor: { x: 100, y: 200, width: 120, height: 40 },
  panel: { width: 320, height: 400 },
  viewport: { width: 1440, height: 900 },
};

describe("placePopover — taraf seçimi", () => {
  it("sağda yer varken sağa açılır", () => {
    const p = placePopover(DESKTOP);
    expect(p.side).toBe("right");
    expect(p.left).toBe(100 + 120 + DEFAULT_GAP);
  });

  it("sağ dolu, sol boşken sola açılır", () => {
    // Blok ekranın sağ kenarında: sağda 40px kaldı, panel 320px.
    const p = placePopover({
      ...DESKTOP,
      anchor: { x: 1280, y: 200, width: 120, height: 40 },
    });
    expect(p.side).toBe("left");
    expect(p.left).toBe(1280 - 320 - DEFAULT_GAP);
  });

  it("iki yan da darken alta açılır", () => {
    // Dar ekran: yatayda hiçbir yana 320px sığmaz.
    const p = placePopover({
      anchor: { x: 20, y: 100, width: 200, height: 40 },
      panel: { width: 320, height: 300 },
      viewport: { width: 375, height: 812 },
    });
    expect(p.side).toBe("bottom");
    expect(p.top).toBe(100 + 40 + DEFAULT_GAP);
  });

  it("yanlar dar ve alt da doluyken üste açılır", () => {
    const p = placePopover({
      anchor: { x: 20, y: 600, width: 200, height: 40 },
      panel: { width: 320, height: 300 },
      viewport: { width: 375, height: 812 },
    });
    expect(p.side).toBe("top");
    expect(p.top).toBe(600 - 300 - DEFAULT_GAP);
  });
});

describe("placePopover — kırpma", () => {
  it("alt kenarı taşan paneli yukarı çeker", () => {
    // Blok ekranın dibinde; panel 400px ve aşağı taşardı.
    const p = placePopover({
      ...DESKTOP,
      anchor: { x: 100, y: 800, width: 120, height: 40 },
    });
    expect(p.top + 400).toBeLessThanOrEqual(900 - DEFAULT_MARGIN);
    expect(p.top).toBe(900 - 400 - DEFAULT_MARGIN);
  });

  it("üst kenarı taşan paneli aşağı çeker", () => {
    const p = placePopover({
      ...DESKTOP,
      anchor: { x: 100, y: 4, width: 120, height: 20 },
    });
    expect(p.top).toBe(DEFAULT_MARGIN);
  });

  /*
   * Panel viewport'tan BÜYÜK olduğunda üst sınır alt sınırın altına
   * düşer. Kırpmanın sırası yanlış kurulsaydı panel ekran dışına
   * kaçardı; burada `margin` kazanmalı ve panelin kendi `overflow`'u
   * devreye girmeli.
   */
  it("viewport'tan uzun panel üst kenara oturur", () => {
    const p = placePopover({
      anchor: { x: 100, y: 300, width: 120, height: 40 },
      panel: { width: 320, height: 1200 },
      viewport: { width: 1440, height: 900 },
    });
    expect(p.top).toBe(DEFAULT_MARGIN);
  });

  it("viewport'tan geniş panel sol kenara oturur", () => {
    const p = placePopover({
      anchor: { x: 100, y: 300, width: 120, height: 40 },
      panel: { width: 2000, height: 300 },
      viewport: { width: 1440, height: 900 },
    });
    expect(p.left).toBe(DEFAULT_MARGIN);
  });

  it("her senaryoda sol ve üst en az margin kadar içeride kalır", () => {
    const cases: AnchorInput[] = [
      DESKTOP,
      { ...DESKTOP, anchor: { x: 0, y: 0, width: 10, height: 10 } },
      { ...DESKTOP, anchor: { x: 1430, y: 890, width: 10, height: 10 } },
      {
        anchor: { x: 300, y: 700, width: 60, height: 200 },
        panel: { width: 320, height: 400 },
        viewport: { width: 375, height: 812 },
      },
    ];

    for (const input of cases) {
      const p = placePopover(input);
      expect(p.left).toBeGreaterThanOrEqual(DEFAULT_MARGIN);
      expect(p.top).toBeGreaterThanOrEqual(DEFAULT_MARGIN);
    }
  });
});

describe("placePopover — sözleşme", () => {
  it("aynı girdi aynı çıktıyı verir", () => {
    expect(placePopover(DESKTOP)).toEqual(placePopover(DESKTOP));
  });

  it("margin ve gap dışarıdan verilebilir", () => {
    const p = placePopover({ ...DESKTOP, margin: 20, gap: 4 });
    expect(p.left).toBe(100 + 120 + 4);
  });
});
