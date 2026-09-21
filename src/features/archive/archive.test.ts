import { describe, expect, it } from "vitest";
import { task } from "@/features/testing/fixtures";
import { archiveDate, groupByCompletedDay } from "./archive";

/** 19 Ağustos 2026, öğlen — yerel saat. */
const NOON_19 = new Date(2026, 7, 19, 12, 0, 0).toISOString();
/** 19 Ağustos 2026, gece 00:30 — yerel saat. */
const LATE_19 = new Date(2026, 7, 19, 0, 30, 0).toISOString();

describe("archiveDate", () => {
  it("damga varsa onun gününü verir", () => {
    const date = archiveDate(
      task({ dueDate: "2026-08-15", done: true, completedAt: NOON_19 }),
    );

    expect(date).toBe("2026-08-19");
  });

  /*
   * Arşivin sorusu "ne zaman bitirdim", "ne zaman için
   * planlamıştım" değil. Dün için planlanıp bugün bitirilen bir iş
   * dünkü listede görünseydi, arşiv o günü yapılmamış gösterirken
   * bugünü boş gösterirdi: iki gün birden yalan.
   */
  it("damga dueDate'i EZER", () => {
    const date = archiveDate(
      task({ dueDate: "2026-08-18", done: true, completedAt: NOON_19 }),
    );

    expect(date).not.toBe("2026-08-18");
    expect(date).toBe("2026-08-19");
  });

  /*
   * Gece yarısından sonra bitirilen iş kullanıcının KENDİ
   * takvimindeki güne yazılmalı. UTC'ye çevrilseydi Türkiye'de
   * 00:30'da bitirilen her iş bir önceki güne düşerdi.
   */
  it("gece yarısından sonrasını YEREL güne yazar", () => {
    const date = archiveDate(task({ done: true, completedAt: LATE_19 }));

    expect(date).toBe("2026-08-19");
  });

  /*
   * 0017 öncesinde bitirilmiş görevler: geriye dönük bir zaman
   * uydurmak yerine elimizdeki en yakın gerçeğe yaslanıyoruz.
   */
  it("damga yoksa dueDate'e düşer", () => {
    const date = archiveDate(
      task({ dueDate: "2026-08-15", done: true, completedAt: null }),
    );

    expect(date).toBe("2026-08-15");
  });

  it("ikisi de yoksa null döner", () => {
    const date = archiveDate(
      task({ dueDate: null, done: true, completedAt: null }),
    );

    expect(date).toBeNull();
  });
});

describe("groupByCompletedDay", () => {
  it("günleri EN YENİ başta sıralar", () => {
    const days = groupByCompletedDay([
      task({ id: "eski", dueDate: "2026-08-15", done: true }),
      task({ id: "yeni", dueDate: "2026-08-19", done: true }),
      task({ id: "orta", dueDate: "2026-08-17", done: true }),
    ]);

    expect(days.map((d) => d.date)).toEqual([
      "2026-08-19",
      "2026-08-17",
      "2026-08-15",
    ]);
  });

  it("aynı gündekileri tek kovada toplar", () => {
    const days = groupByCompletedDay([
      task({ id: "a", dueDate: "2026-08-19", done: true, sortOrder: 0 }),
      task({ id: "b", dueDate: "2026-08-19", done: true, sortOrder: 1 }),
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].tasks.map((t) => t.id)).toEqual(["a", "b"]);
  });

  /*
   * Karışık bir listede bazıları saate, bazıları sıraya göre
   * dizilirdi (0017 öncesi görevlerde damga yok). Tek kural, her
   * satırda geçerli.
   */
  it("gün içinde sortOrder'a göre dizer", () => {
    const days = groupByCompletedDay([
      task({ id: "ikinci", dueDate: "2026-08-19", done: true, sortOrder: 5 }),
      task({ id: "ilk", dueDate: "2026-08-19", done: true, sortOrder: 1 }),
    ]);

    expect(days[0].tasks.map((t) => t.id)).toEqual(["ilk", "ikinci"]);
  });

  it("açık görevleri HİÇ almaz", () => {
    const days = groupByCompletedDay([
      task({ dueDate: "2026-08-19", done: false }),
    ]);

    expect(days).toHaveLength(0);
  });

  it("tarihsiz ve damgasız biten görevi atlar", () => {
    const days = groupByCompletedDay([
      task({ dueDate: null, done: true, completedAt: null }),
    ]);

    expect(days).toHaveLength(0);
  });

  it("damgalı tarihsiz görevi damganın gününe koyar", () => {
    const days = groupByCompletedDay([
      task({ id: "havuz", dueDate: null, done: true, completedAt: NOON_19 }),
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].date).toBe("2026-08-19");
  });

  it("boş listede boş dizi döner", () => {
    expect(groupByCompletedDay([])).toEqual([]);
  });
});
