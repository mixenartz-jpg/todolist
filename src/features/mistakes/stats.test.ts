import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { mistake } from "@/features/testing/fixtures";
import { GRADUATED_STAGE } from "./review";
import { reviewStats } from "./stats";

const TODAY = asDateStr("2026-08-24");

describe("reviewStats", () => {
  it("boş listede her sayı sıfır", () => {
    const stats = reviewStats([], TODAY);

    expect(stats.total).toBe(0);
    expect(stats.graduated).toBe(0);
    expect(stats.inProgress).toBe(0);
    expect(stats.dueToday).toBe(0);
    expect(stats.byStage).toEqual([0, 0, 0, 0, 0]);
  });

  it("mezunları ve sürenleri ayırır", () => {
    const stats = reviewStats(
      [
        mistake({ id: "m1", reviewStage: GRADUATED_STAGE }),
        mistake({ id: "m2", reviewStage: GRADUATED_STAGE }),
        mistake({ id: "m3", reviewStage: 1 }),
      ],
      TODAY,
    );

    expect(stats.total).toBe(3);
    expect(stats.graduated).toBe(2);
    expect(stats.inProgress).toBe(1);
  });

  it("hepsi mezunsa süren kalmaz", () => {
    const stats = reviewStats(
      [
        mistake({ id: "m1", reviewStage: GRADUATED_STAGE }),
        mistake({ id: "m2", reviewStage: GRADUATED_STAGE }),
      ],
      TODAY,
    );

    expect(stats.graduated).toBe(2);
    expect(stats.inProgress).toBe(0);
    expect(stats.dueToday).toBe(0);
  });

  it("hiçbiri mezun değilse mezun sayısı sıfırdır", () => {
    const stats = reviewStats(
      [
        mistake({ id: "m1", reviewStage: 0 }),
        mistake({ id: "m2", reviewStage: 3 }),
      ],
      TODAY,
    );

    expect(stats.graduated).toBe(0);
    expect(stats.inProgress).toBe(2);
  });

  it("aşama dağılımını sayar", () => {
    const stats = reviewStats(
      [
        mistake({ id: "m1", reviewStage: 0 }),
        mistake({ id: "m2", reviewStage: 0 }),
        mistake({ id: "m3", reviewStage: 2 }),
        mistake({ id: "m4", reviewStage: GRADUATED_STAGE }),
      ],
      TODAY,
    );

    // index = tamamlanan tekrar sayısı; son kova mezunlar.
    expect(stats.byStage).toEqual([2, 0, 1, 0, 1]);
    // Dağılım toplamı daima `total`'a eşit olmalı.
    expect(stats.byStage.reduce((a, b) => a + b, 0)).toBe(stats.total);
  });

  it("vadesi gelenleri sayar — geçmiş vadeler dahil", () => {
    const stats = reviewStats(
      [
        mistake({ id: "m1", reviewStage: 0, nextReviewDate: TODAY }),
        mistake({
          id: "m2",
          reviewStage: 1,
          nextReviewDate: asDateStr("2026-08-20"),
        }),
        mistake({
          id: "m3",
          reviewStage: 1,
          nextReviewDate: asDateStr("2026-09-10"),
        }),
        mistake({ id: "m4", reviewStage: GRADUATED_STAGE }),
      ],
      TODAY,
    );

    expect(stats.dueToday).toBe(2);
  });

  it("mezuniyet oranı — mezun / toplam", () => {
    const stats = reviewStats(
      [
        mistake({ id: "m1", reviewStage: GRADUATED_STAGE }),
        mistake({ id: "m2", reviewStage: GRADUATED_STAGE }),
        mistake({ id: "m3", reviewStage: GRADUATED_STAGE }),
        mistake({ id: "m4", reviewStage: 1 }),
      ],
      TODAY,
    );

    expect(stats.graduationRate).toBe(0.75);
  });

  it("boş listede mezuniyet oranı null — sıfır DEĞİL", () => {
    // 0/0'ı "%0 mezun" diye göstermek yalan olurdu: ölçülecek bir şey
    // yok demek ile "hiçbirini bitiremedin" demek aynı şey değil.
    expect(reviewStats([], TODAY).graduationRate).toBeNull();
  });
});
