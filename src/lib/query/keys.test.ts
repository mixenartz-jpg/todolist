import { describe, expect, it } from "vitest";
import { asDateStr, isDateStr } from "@/lib/date/date";
import { qk } from "./keys";

/**
 * Anahtar hiyerarşisinin taşıdığı örtük varsayımları korur.
 *
 * Bu testler bir fonksiyonun davranışını değil, ANAHTAR ŞEKİLLERİNİN
 * birbirine göre konumunu koruyor — çünkü önbellek geçersiz kılma
 * mantığı o konumlara dayanıyor ve bir anahtar sessizce değiştiğinde
 * hiçbir tip hatası oluşmaz.
 */
describe("qk önek hiyerarşisi", () => {
  it("gün notu ile ay plan haritası birbirine KARIŞMAZ", () => {
    /*
     * `useSaveDayPlan.onSettled` ay haritasını `queryKey[1] === "month"`
     * yüklemiyle ayırt ediyor. Bu yalnızca hiçbir DateStr'in "month"
     * olamaması sayesinde güvenli — aşağıdaki iddia o dayanağı
     * açıkça sabitliyor.
     */
    expect(isDateStr("month")).toBe(false);

    const dayKey = qk.note(asDateStr("2026-08-12"));
    const monthKey = qk.notePlansMonth(asDateStr("2026-08-01"));

    expect(dayKey[1]).not.toBe("month");
    expect(monthKey[1]).toBe("month");

    // İkisi de `qk.notes()` önekinin altında: bir plan kaydedilince
    // önek eşleşmesi ikisini birden bulabilmeli.
    expect(dayKey[0]).toBe(qk.notes()[0]);
    expect(monthKey[0]).toBe(qk.notes()[0]);
  });

  it("hedef anahtarı 'plan' önekini TAŞIMAZ", () => {
    /*
     * `["plan", "goals", month]` yazılsaydı, ileride eklenecek herhangi
     * bir `qk.plan(...)` anahtarı önek eşleşmesiyle hedefleri de
     * geçersiz kılardı. Tireli tek parça bunu imkânsız kılıyor.
     */
    expect(qk.planGoals()[0]).toBe("plan-goals");
    expect(qk.planGoalsMonth(asDateStr("2026-08-01"))[0]).toBe("plan-goals");
  });

  it("kök anahtarların hepsi birbirinden farklıdır", () => {
    /*
     * Aynı kökü paylaşan iki anahtar, birini geçersiz kılmanın ötekini
     * de düşürmesi demektir. `as const` sayesinde TypeScript bunu zaten
     * derleme anında yakalıyor (iki kök çakışsaydı aşağıdaki
     * karşılaştırma "no overlap" hatası verirdi) — bu test aynı
     * güvenceyi çalışma anında da sabitler ve `as const` bir gün
     * gevşetilirse sessizce kaybolmasını engeller.
     */
    const roots = [
      qk.routines()[0],
      qk.entries()[0],
      qk.tasks()[0],
      qk.notes()[0],
      qk.journal()[0],
      qk.mistakes()[0],
      qk.mistakeImage("a.png")[0],
      qk.sectionLabels()[0],
      qk.categories()[0],
      qk.planGoals()[0],
    ];

    expect(new Set(roots).size).toBe(roots.length);
  });

  it("yanlış görseli 'mistakes' önekinin altında DEĞİLDİR", () => {
    // Mevcut davranışı sabitler: yeni bir yanlış eklenince imzalı
    // URL'lerin hepsi çöpe gitmemeli.
    expect(qk.mistakeImage("a/b.png")[0]).not.toBe(qk.mistakes()[0]);
  });
});
