import { describe, expect, it } from "vitest";
import { normalizeNoteInput, shouldPersistNote, TASK_NOTE_MAX } from "./note";

describe("normalizeNoteInput", () => {
  it("kenar boşluklarını kırpar", () => {
    expect(normalizeNoteInput("  iki sayfa oku  ")).toBe("iki sayfa oku");
  });

  it("çok satırlı metni korur", () => {
    expect(normalizeNoteInput("birinci\nikinci")).toBe("birinci\nikinci");
  });

  /*
   * `rename.ts`'ten AYRILAN davranış: orada boş girdi `null`'dı ve
   * "yok say" demekti. Burada `null` "sil" demek ve bu meşru.
   */
  it("boş girdi null döner — SİLME emri", () => {
    expect(normalizeNoteInput("")).toBeNull();
  });

  it("yalnızca boşluktan oluşan girdi de silme emridir", () => {
    expect(normalizeNoteInput("   \n  ")).toBeNull();
  });

  it("tam sınır uzunluğu geçer", () => {
    const note = "a".repeat(TASK_NOTE_MAX);
    expect(normalizeNoteInput(note)).toBe(note);
  });

  /*
   * Bu testin varlık sebebi: sınır aşımında `null` dönmek, kullanıcı
   * fazla yazdığında MEVCUT NOTUNU SİLERDİ. `undefined` "yok say"
   * demek ve tek doğru cevap o.
   */
  it("sınırı aşan girdi undefined döner — silme DEĞİL, yok sayma", () => {
    expect(normalizeNoteInput("a".repeat(TASK_NOTE_MAX + 1))).toBeUndefined();
  });
});

describe("shouldPersistNote", () => {
  it("değişmemiş metni yazmaz", () => {
    expect(shouldPersistNote("aynı", "aynı")).toBe(false);
  });

  it("yeni not yazılır", () => {
    expect(shouldPersistNote(null, "yeni")).toBe(true);
  });

  it("değişen not yazılır", () => {
    expect(shouldPersistNote("eski", "yeni")).toBe(true);
  });

  it("var olan notun SİLİNMESİ yazılır", () => {
    expect(shouldPersistNote("bir şey", null)).toBe(true);
  });

  it("zaten notsuz görevde boş bırakmak yazma değildir", () => {
    expect(shouldPersistNote(null, null)).toBe(false);
  });

  it("sadece kenar boşluğu eklemek değişiklik sayılmaz", () => {
    // normalizeNoteInput zaten kırpıyor; kaydedilecek değer aynı olurdu.
    expect(shouldPersistNote("  metin  ", "metin")).toBe(false);
  });

  it("geçersiz girdi (sınır aşımı) hiçbir zaman yazılmaz", () => {
    expect(shouldPersistNote("mevcut not", undefined)).toBe(false);
    expect(shouldPersistNote(null, undefined)).toBe(false);
  });
});
