import { describe, expect, it } from "vitest";
import type { DayClose } from "@/features/today/daysummary";
import type { StreakResult } from "@/features/stats/streak";
import type { GoalPace } from "@/features/planlama/pace";
import {
  atRiskLine,
  dayLine,
  idleGoalLine,
  paceLine,
  streakLine,
  trendLine,
  weakDayLine,
} from "./messages";

function streak(current: number, longest: number): StreakResult {
  return { current, longest, unit: "day" };
}

function close(
  routines: [number, number],
  tasks: [number, number],
): DayClose {
  return {
    routines: { done: routines[0], total: routines[1] },
    tasks: { done: tasks[0], total: tasks[1] },
  };
}

describe("streakLine", () => {
  /*
   * Sınır vakası: "1 gündür aksatmadın" komik olurdu. Kontrol,
   * cümlenin sayıyla birlikte ANLAMLI kalmasında.
   */
  it("seri 0 iken suçlamaz, yeniden başlamaya çağırır", () => {
    const line = streakLine(streak(0, 12));

    expect(line.tone).toBe("neutral");
    expect(line.detail).toContain("12");
    expect(line.action).not.toBeNull();
  });

  it("seri 0 ve rekor da 0 iken rekordan HİÇ söz etmez", () => {
    const line = streakLine(streak(0, 0));

    // "En uzun serin 0 gün" bir bilgi değil.
    expect(line.detail).not.toContain("0");
  });

  it("rekor kırıldığında kutlar ve EYLEM VERMEZ", () => {
    const line = streakLine(streak(16, 15));

    expect(line.tone).toBe("good");
    expect(line.headline).toContain("rekor");
    // Yapılacak şey zaten yapılmış.
    expect(line.action).toBeNull();
  });

  it("rekora eşitlendiğinde bir adım kaldığını söyler", () => {
    const line = streakLine(streak(15, 15));

    expect(line.tone).toBe("good");
    expect(line.detail).toContain("rekor");
  });

  it("rekorun altındayken kalan farkı verir", () => {
    const line = streakLine(streak(12, 15));

    expect(line.headline).toBe("12 gün");
    expect(line.detail).toContain("3 gün kaldı");
  });

  it("birimi rutin tipine göre yazar", () => {
    const line = streakLine({ current: 5, longest: 9, unit: "week" });

    expect(line.headline).toBe("5 hafta");
    expect(line.detail).toContain("hafta");
  });
});

describe("trendLine", () => {
  /*
   * Ölçülemeyen şey söylenmez: tek haftalık veride "öndesin" demek
   * uydurmaktır.
   */
  it("karşılaştırma yoksa null döner", () => {
    expect(trendLine(null)).toBeNull();
  });

  it("ilerlemeyi puanla söyler", () => {
    const line = trendLine({ current: 0.62, previous: 0.5, delta: 0.12 });

    expect(line!.tone).toBe("good");
    expect(line!.headline).toContain("%12");
    expect(line!.headline).toContain("önde");
  });

  it("gerilemeyi suçlamadan söyler ve eyleme bağlar", () => {
    const line = trendLine({ current: 0.55, previous: 0.8, delta: -0.25 });

    expect(line!.tone).toBe("warn");
    expect(line!.headline).toContain("geride");
    expect(line!.action).not.toBeNull();
  });

  /*
   * "%1 öndesin" ölçüm hassasiyetinin altında bir iddiadır ve koçu
   * güvenilmez yapar.
   */
  it("üç puanın altındaki oynamayı 'aynı tempo' sayar", () => {
    const line = trendLine({ current: 0.61, previous: 0.6, delta: 0.01 });

    expect(line!.headline).toBe("Aynı tempo");
    expect(line!.tone).toBe("neutral");
  });
});

describe("atRiskLine", () => {
  it("uyarır ama 'serin gitti' DEMEZ", () => {
    const line = atRiskLine("Matematik", 12);

    expect(line.tone).toBe("warn");
    expect(line.headline).toContain("bugüne bakıyor");
    expect(line.headline).not.toContain("gitti");
    expect(line.action).not.toBeNull();
  });
});

describe("dayLine", () => {
  it("gün %100 olduğunda kutlar", () => {
    const line = dayLine(close([3, 3], [2, 2]));

    expect(line.tone).toBe("good");
    expect(line.headline).toContain("5/5");
    expect(line.action).toBeNull();
  });

  /*
   * `null` ≠ `0`: ölçülecek iş yokken "%0 tamamladın" demek, olmayan
   * bir işi yapmamakla suçlamaktır.
   */
  it("hiç iş yoksa oran YAZMAZ, öğretir", () => {
    const line = dayLine(close([0, 0], [0, 0]));

    expect(line.tone).toBe("neutral");
    expect(line.headline).not.toContain("0/0");
    expect(line.action).not.toBeNull();
  });

  it("hiçbiri bitmemişken başlamaya çağırır", () => {
    const line = dayLine(close([0, 2], [0, 3]));

    expect(line.headline).toBe("0/5");
    expect(line.detail).toContain("5 iş");
  });

  it("yarısı bitmişken kalanı söyler", () => {
    const line = dayLine(close([2, 3], [1, 3]));

    expect(line.headline).toBe("3/6");
    expect(line.detail).toContain("3 iş kaldı");
  });
});

describe("weakDayLine", () => {
  const NAMES = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

  function day(weekday: number, ratio: number, days: number) {
    return { weekday, ratio, days };
  }

  it("zayıf günü en iyi günle karşılaştırarak söyler", () => {
    const line = weakDayLine(
      [day(1, 0.9, 5), day(3, 0.4, 5), day(5, 0.8, 5)],
      NAMES,
    );

    expect(line!.headline).toContain("Çarşamba");
    expect(line!.detail).toContain("Pazartesi");
    expect(line!.tone).toBe("warn");
  });

  /*
   * Tek bir kötü Çarşamba bir örüntü değildir ve koç örüntü olmayan
   * şeye örüntü diyemez.
   */
  it("yeterli ölçüm yoksa null döner", () => {
    const line = weakDayLine([day(1, 0.9, 5), day(3, 0.2, 1)], NAMES);

    expect(line).toBeNull();
  });

  it("günler birbirine yakınsa zayıf gün İLAN ETMEZ", () => {
    const line = weakDayLine(
      [day(1, 0.72, 6), day(3, 0.68, 6), day(5, 0.7, 6)],
      NAMES,
    );

    expect(line).toBeNull();
  });

  it("tek ölçülmüş gün varsa karşılaştırma yapmaz", () => {
    expect(weakDayLine([day(1, 0.3, 9)], NAMES)).toBeNull();
  });
});

describe("paceLine", () => {
  function pace(over: Partial<GoalPace>): GoalPace {
    return {
      verdict: "onTrack",
      expected: 0.5,
      actual: 0.5,
      perDayNeeded: null,
      ...over,
    };
  }

  it("öndeyken kutlar, eylem vermez", () => {
    const line = paceLine(pace({ verdict: "ahead", actual: 0.8 }), "Üçgenler");

    expect(line!.tone).toBe("good");
    expect(line!.headline).toContain("Üçgenler");
    expect(line!.action).toBeNull();
  });

  it("gerideyken suçlamadan söyler ve günlük hedef verir", () => {
    const line = paceLine(
      pace({ verdict: "behind", actual: 0.2, perDayNeeded: 4 }),
      "Üçgenler",
    );

    expect(line!.tone).toBe("warn");
    expect(line!.detail).toContain("günde 4");
    expect(line!.action).not.toBeNull();
  });

  /*
   * Ölçmediğimiz bir hedef hakkında konuşmak uydurmaktır;
   * `goalProgress`'in `none` modunun arayüzdeki karşılığı susmaktır.
   */
  it("ölçülmeyen hedefte null döner", () => {
    expect(paceLine(pace({ verdict: "noTarget" }), "Üçgenler")).toBeNull();
  });

  it("yolundayken nötr kalır", () => {
    const line = paceLine(pace({ verdict: "onTrack" }), "Üçgenler");

    expect(line!.tone).toBe("neutral");
  });
});

describe("idleGoalLine", () => {
  it("uzun boşluğu suçlamadan bildirir", () => {
    const line = idleGoalLine("Üçgenler", 9);

    expect(line!.tone).toBe("warn");
    expect(line!.detail).toContain("9 gündür");
    expect(line!.action).not.toBeNull();
  });

  /* Üç gün bir ihmal değil, bir hafta sonu. */
  it("eşiğin altındaki boşluğu ANMAZ", () => {
    expect(idleGoalLine("Üçgenler", 3)).toBeNull();
    expect(idleGoalLine("Üçgenler", 6)).toBeNull();
  });

  it("hiç bağlı görev yoksa null döner", () => {
    expect(idleGoalLine("Üçgenler", null)).toBeNull();
  });
});
