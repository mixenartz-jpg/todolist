import { describe, expect, it } from "vitest";
import type { CoachLine } from "./messages";
import { pickCoachLine } from "./pick";

function line(
  headline: string,
  tone: CoachLine["tone"],
  withAction: boolean,
): CoachLine {
  return {
    headline,
    detail: null,
    action: withAction ? { label: "Git", href: "/bugun" } : null,
    tone,
  };
}

describe("pickCoachLine", () => {
  /*
   * Zamana duyarlı tek sınıf: kaybedilmek üzere olan ve önlenebilir
   * bir şey. Kutlamanın önüne geçmesi bilinçli — serisi bugün
   * kırılacak birine önce "rekor kırdın" demek, sonra o rekoru
   * kaybettirmektir.
   */
  it("önlenebilir kaybı kutlamanın ÖNÜNE koyar", () => {
    const picked = pickCoachLine([
      line("rekor", "good", false),
      line("serin bugüne bakıyor", "warn", true),
    ]);

    expect(picked!.headline).toBe("serin bugüne bakıyor");
  });

  it("kutlamayı eylemsiz uyarının önüne koyar", () => {
    const picked = pickCoachLine([
      line("geridesin", "warn", false),
      line("rekor", "good", false),
    ]);

    expect(picked!.headline).toBe("rekor");
  });

  it("iyi haberi nötr durumun önüne koyar", () => {
    const picked = pickCoachLine([
      line("3/5", "neutral", true),
      line("öndesin", "good", true),
    ]);

    expect(picked!.headline).toBe("öndesin");
  });

  /*
   * `trendLine` ve `weakDayLine` ölçüm yetersizse bilerek null döner;
   * filtreleme her çağrı yerinde tekrarlanmamalı.
   */
  it("null girdileri atlar", () => {
    const picked = pickCoachLine([null, line("3/5", "neutral", true), null]);

    expect(picked!.headline).toBe("3/5");
  });

  it("hiç cümle yoksa null döner — dolgu cümlesi uydurmaz", () => {
    expect(pickCoachLine([])).toBeNull();
    expect(pickCoachLine([null, null])).toBeNull();
  });

  /*
   * Eşitlikte çağıranın sırası kazanır: karar, sıralamanın gizli bir
   * yan etkisi olmak yerine çağrı yerinde görünür olsun.
   */
  it("aynı sınıfta DİZİ SIRASI kazanır", () => {
    const picked = pickCoachLine([
      line("ilk", "neutral", true),
      line("ikinci", "neutral", true),
    ]);

    expect(picked!.headline).toBe("ilk");
  });
});
