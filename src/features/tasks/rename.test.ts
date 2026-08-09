import { describe, expect, it } from "vitest";
import {
  normalizeTitleInput,
  shouldPersistTitle,
  TASK_TITLE_MAX,
} from "./rename";

describe("normalizeTitleInput", () => {
  it("normal bir adı kırpılmış olarak döner", () => {
    expect(normalizeTitleInput("  Rapor yaz  ")).toBe("Rapor yaz");
  });

  it("iç boşlukları korur", () => {
    // Yalnızca uçlar kırpılır; kullanıcının yazdığı cümle bozulmamalı.
    expect(normalizeTitleInput("Rapor yaz ve gönder")).toBe(
      "Rapor yaz ve gönder",
    );
  });

  it("boş girdiyi reddeder", () => {
    // Veritabanı kısıtı adsız göreve izin vermiyor (migration 0001).
    expect(normalizeTitleInput("")).toBeNull();
    expect(normalizeTitleInput("   ")).toBeNull();
  });

  it("sınırdaki ad kabul edilir, aşan reddedilir", () => {
    const atLimit = "a".repeat(TASK_TITLE_MAX);
    expect(normalizeTitleInput(atLimit)).toBe(atLimit);
    expect(normalizeTitleInput("a".repeat(TASK_TITLE_MAX + 1))).toBeNull();
  });

  it("kırpma sonrası sınıra inen girdiyi kabul eder", () => {
    // Uçlardaki boşluk sınırı aşırmamalı: sunucu da kırpılmış hâli
    // ölçüyor (`length(trim(title))`).
    const padded = `  ${"a".repeat(TASK_TITLE_MAX)}  `;
    expect(normalizeTitleInput(padded)).toBe("a".repeat(TASK_TITLE_MAX));
  });
});

describe("shouldPersistTitle", () => {
  it("yeni bir ad yazıldığında yazar", () => {
    expect(shouldPersistTitle("Rapor yaz", "Raporu gönder")).toBe(true);
  });

  it("ad değişmiyorsa yazmaz", () => {
    // `onBlur` kullanıcı hiçbir şey yazmadan başka yere tıkladığında da
    // tetiklenir; her odak kaybında ağa çıkmak boş bir yazma olurdu.
    expect(shouldPersistTitle("Rapor yaz", "Rapor yaz")).toBe(false);
  });

  it("yalnızca uçlardaki boşluk eklendiyse yazmaz", () => {
    // Sunucu da kırpacaktı; bu bir değişiklik değil.
    expect(shouldPersistTitle("Rapor yaz", normalizeTitleInput("  Rapor yaz  "))).toBe(
      false,
    );
  });

  it("geçersiz girdiyi (null) hiçbir zaman yazmaz", () => {
    // Boş kutu görevi ADSIZ BIRAKMAZ ve SİLMEZ — düzenleme yok sayılır.
    expect(shouldPersistTitle("Rapor yaz", null)).toBe(false);
  });

  it("mevcut adın uçlarında boşluk olsa da değişimi doğru ölçer", () => {
    // Savunma amaçlı: veri kırpılmış gelmeli ama gelmediyse de karar
    // kırpılmış değerler üzerinden verilmeli.
    expect(shouldPersistTitle("  Rapor yaz  ", "Rapor yaz")).toBe(false);
    expect(shouldPersistTitle("  Rapor yaz  ", "Raporu gönder")).toBe(true);
  });
});
