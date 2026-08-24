import { describe, expect, it } from "vitest";
import { taskColorSlot } from "./color";

/** Kategori kimliğinden renge — testlerde sabit bir harita yeter. */
function colorOf(map: Record<string, number>) {
  return (categoryId: string) => map[categoryId];
}

const NONE = colorOf({});

describe("taskColorSlot", () => {
  it("görevin kendi rengi kategoriyi EZER", () => {
    const slot = taskColorSlot(
      { colorSlot: 3, categoryId: "c1" },
      colorOf({ c1: 5 }),
    );
    expect(slot).toBe(3);
  });

  it("renk verilmemişse kategoriden devralır", () => {
    const slot = taskColorSlot(
      { colorSlot: null, categoryId: "c1" },
      colorOf({ c1: 5 }),
    );
    expect(slot).toBe(5);
  });

  it("ne renk ne kategori varsa null döner", () => {
    expect(taskColorSlot({ colorSlot: null, categoryId: null }, NONE)).toBeNull();
  });

  it("kategori haritada yoksa patlamaz, nötre düşer", () => {
    // Silinen kategorinin `on delete set null`'ı sunucuda işlenmiş ama
    // önbellekteki görev hâlâ eski kimliği taşıyor olabilir.
    const slot = taskColorSlot({ colorSlot: null, categoryId: "silinmis" }, NONE);
    expect(slot).toBeNull();
  });

  /*
   * Bu testin varlık sebebi: slot 0 MAVİDİR ve falsy'dir.
   * `task.colorSlot || kategoriRengi` yazan bir uygulama burada 5
   * döndürür ve kullanıcının seçtiği mavi sessizce kaybolur.
   */
  it("slot 0 (mavi) falsy olmasına rağmen kategoriyi ezer", () => {
    const slot = taskColorSlot(
      { colorSlot: 0, categoryId: "c1" },
      colorOf({ c1: 5 }),
    );
    expect(slot).toBe(0);
  });

  it("kategori rengi 0 ise de devralınır", () => {
    const slot = taskColorSlot(
      { colorSlot: null, categoryId: "c1" },
      colorOf({ c1: 0 }),
    );
    expect(slot).toBe(0);
  });

  it("üst sınır slotu (7) geçer", () => {
    expect(taskColorSlot({ colorSlot: 7, categoryId: null }, NONE)).toBe(7);
  });
});
