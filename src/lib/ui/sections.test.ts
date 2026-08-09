import { describe, expect, it } from "vitest";
import {
  isCustomized,
  normalizeLabelInput,
  resolveLabel,
  SECTION_DEFAULTS,
  SECTION_LABEL_MAX,
  shouldPersistLabel,
} from "./sections";

describe("resolveLabel", () => {
  it("yazılmamış anahtar için varsayılanı döner", () => {
    expect(resolveLabel(new Map(), "today.tasks")).toBe("Görevler");
  });

  it("özel ad varsa onu döner", () => {
    const overrides = new Map([["today.tasks", "Sorular"]]);
    expect(resolveLabel(overrides, "today.tasks")).toBe("Sorular");
  });

  it("bir anahtarın özelleştirilmesi diğerlerini etkilemez", () => {
    const overrides = new Map([["today.tasks", "Sorular"]]);
    expect(resolveLabel(overrides, "today.journal")).toBe("Günlük");
  });

  it("her varsayılan boş olmayan bir metindir", () => {
    // Boş bir varsayılan, düzenlenemez bir başlık demektir: tıklanacak
    // hedef kalmaz.
    for (const label of Object.values(SECTION_DEFAULTS)) {
      expect(label.trim().length).toBeGreaterThan(0);
      expect(label.length).toBeLessThanOrEqual(SECTION_LABEL_MAX);
    }
  });
});

describe("isCustomized", () => {
  it("yalnızca yazılmış anahtarlar için doğrudur", () => {
    const overrides = new Map([["today.tasks", "Sorular"]]);
    expect(isCustomized(overrides, "today.tasks")).toBe(true);
    expect(isCustomized(overrides, "today.review")).toBe(false);
  });
});

describe("normalizeLabelInput", () => {
  it("normal bir adı kırpılmış olarak döner", () => {
    expect(normalizeLabelInput("today.tasks", "  Sorular  ")).toBe("Sorular");
  });

  it("boş girdi varsayılana dönüştür (null)", () => {
    expect(normalizeLabelInput("today.tasks", "")).toBeNull();
    expect(normalizeLabelInput("today.tasks", "   ")).toBeNull();
  });

  it("varsayılanın kendisi yazıldığında satır bırakmaz", () => {
    expect(normalizeLabelInput("today.tasks", "Görevler")).toBeNull();
    expect(normalizeLabelInput("today.tasks", "  Görevler  ")).toBeNull();
  });

  it("sınırdaki ad kabul edilir, aşan reddedilir", () => {
    const atLimit = "a".repeat(SECTION_LABEL_MAX);
    expect(normalizeLabelInput("today.tasks", atLimit)).toBe(atLimit);
    expect(normalizeLabelInput("today.tasks", "a".repeat(SECTION_LABEL_MAX + 1))).toBeNull();
  });
});

describe("shouldPersistLabel", () => {
  it("yeni bir ad yazıldığında yazar", () => {
    expect(shouldPersistLabel("today.tasks", "Görevler", "Sorular")).toBe(true);
  });

  it("görünen ad değişmiyorsa yazmaz", () => {
    // `onBlur` kullanıcı hiçbir şey yazmadan başka yere tıkladığında da
    // tetiklenir; her seferinde ağa çıkmak boş bir yazma olurdu.
    expect(shouldPersistLabel("today.tasks", "Sorular", "Sorular")).toBe(false);
  });

  it("özel ad varken varsayılana dönüş yazar (satır silinir)", () => {
    expect(shouldPersistLabel("today.tasks", "Sorular", null)).toBe(true);
  });

  it("zaten varsayılanken boş kutu yazmaz", () => {
    // Silinecek satır yok; istek sunucuya hiç gitmemeli.
    expect(shouldPersistLabel("today.tasks", "Görevler", null)).toBe(false);
  });
});
