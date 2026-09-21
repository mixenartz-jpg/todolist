import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { planGoal, task } from "@/features/testing/fixtures";
import { goalProgress } from "./rollup";
import { daysSinceGoalTask, goalPace } from "./pace";

const d = asDateStr;

/** Ağustos 2026: 31 gün. */
const AUG = d("2026-08-01");

/** Sayısal hedef: 30 adet, `done` kadarı yapılmış. */
function counted(done: number, target = 30) {
  return goalProgress(
    planGoal({ id: "g1", month: AUG, targetCount: target, doneCount: done }),
    [],
  );
}

describe("goalPace — beklenen oran", () => {
  it("ayın ortasında yaklaşık yarıyı bekler", () => {
    // 16/31 ≈ 0.516
    const pace = goalPace(counted(15), d("2026-08-16"));

    expect(pace.expected).toBeCloseTo(16 / 31, 3);
  });

  /*
   * Ayın 1'inde gün henüz bitmedi ama BAŞLADI; "beklenen %0" demek
   * ilk günü hiç yokmuş gibi saymak olurdu.
   */
  it("ayın ilk gününde sıfır DEĞİL", () => {
    const pace = goalPace(counted(0), AUG);

    expect(pace.expected).toBeCloseTo(1 / 31, 3);
  });

  it("ayın son gününde tamdır", () => {
    const pace = goalPace(counted(30), d("2026-08-31"));

    expect(pace.expected).toBe(1);
  });

  /*
   * Kırpma olmasaydı Eylül'de Ağustos hedefine bakmak "beklenen
   * %120" gibi anlamsız bir sayı üretirdi.
   */
  it("geçmiş ayda 1'e kırpılır", () => {
    const pace = goalPace(counted(10), d("2026-09-15"));

    expect(pace.expected).toBe(1);
  });

  it("gelecek ayda sıfırdır", () => {
    const pace = goalPace(counted(0), d("2026-07-10"));

    expect(pace.expected).toBe(0);
  });
});

describe("goalPace — karar", () => {
  it("beklenenin 10 puandan fazla üstü ÖNDE", () => {
    // 16/31 ≈ 0.516 beklenir; 0.8 gerçekleşmiş.
    const pace = goalPace(counted(24), d("2026-08-16"));

    expect(pace.verdict).toBe("ahead");
  });

  it("beklenenin 10 puandan fazla altı GERİDE", () => {
    // 16/31 ≈ 0.516 beklenir; 0.2 gerçekleşmiş.
    const pace = goalPace(counted(6), d("2026-08-16"));

    expect(pace.verdict).toBe("behind");
  });

  /*
   * Dar bir eşik kullanıcıyı her gün "geridesin" diye uyarırdı:
   * hafta sonu çalışmayan biri her Pazartesi geri düşer, Salı
   * toparlar. Koç günlük dalgalanmaya değil eğilime bakar.
   */
  it("eşik içindeki sapma YOLUNDA sayılır", () => {
    // 16/31 ≈ 0.516; 14/30 ≈ 0.467 → fark ≈ -0.049, tolerans içinde.
    const pace = goalPace(counted(14), d("2026-08-16"));

    expect(pace.verdict).toBe("onTrack");
  });

  /*
   * Ölçmediğimiz bir şey hakkında "geridesin" demek uydurmaktır.
   */
  it("ölçülmeyen hedefte noTarget döner", () => {
    const progress = goalProgress(
      planGoal({ month: AUG, targetCount: null }),
      [],
    );
    const pace = goalPace(progress, d("2026-08-16"));

    expect(pace.verdict).toBe("noTarget");
    expect(pace.perDayNeeded).toBeNull();
  });
});

describe("goalPace — günde gereken", () => {
  it("kalan günlere böler ve YUKARI yuvarlar", () => {
    // 30-6 = 24 kalan, 16 gün kaldı (16..31) → 1.5 → 2
    const pace = goalPace(counted(6), d("2026-08-16"));

    expect(pace.perDayNeeded).toBe(2);
  });

  /*
   * Yukarı yuvarlama şart: 3.2 gerekirken "günde 3" demek
   * yetişmemek demektir ve koç yetişmeyen bir plan öneremez.
   */
  it("son günde kalanın tamamını ister", () => {
    const pace = goalPace(counted(25), d("2026-08-31"));

    expect(pace.perDayNeeded).toBe(5);
  });

  it("hedef tamamlanmışsa null döner", () => {
    const pace = goalPace(counted(30), d("2026-08-16"));

    expect(pace.perDayNeeded).toBeNull();
  });

  it("göreve bağlı ilerlemede null döner", () => {
    // "Günde 0.4 görev" bir cümle değil.
    const progress = goalProgress(planGoal({ id: "g1", month: AUG }), [
      task({ goalId: "g1", done: true }),
      task({ goalId: "g1", done: false }),
    ]);
    const pace = goalPace(progress, d("2026-08-16"));

    expect(pace.actual).toBeCloseTo(0.5);
    expect(pace.perDayNeeded).toBeNull();
  });
});

describe("daysSinceGoalTask", () => {
  const progress = goalProgress(planGoal({ id: "g1", month: AUG }), []);

  it("son bağlı görevden bu yana geçen günü verir", () => {
    const days = daysSinceGoalTask(
      progress,
      [
        { goalId: "g1", dueDate: d("2026-08-10") },
        { goalId: "g1", dueDate: d("2026-08-07") },
      ],
      d("2026-08-19"),
    );

    expect(days).toBe(9);
  });

  it("başka hedefin görevini saymaz", () => {
    const days = daysSinceGoalTask(
      progress,
      [{ goalId: "baska", dueDate: d("2026-08-18") }],
      d("2026-08-19"),
    );

    expect(days).toBeNull();
  });

  it("hiç bağlı görev yoksa null döner", () => {
    expect(daysSinceGoalTask(progress, [], d("2026-08-19"))).toBeNull();
  });

  /* Gelecek tarihli görev "boşluk" saymaz: plan zaten yapılmış. */
  it("gelecek tarihli görev boşluğu sıfırlar", () => {
    const days = daysSinceGoalTask(
      progress,
      [{ goalId: "g1", dueDate: d("2026-08-25") }],
      d("2026-08-19"),
    );

    expect(days).toBe(0);
  });

  it("bugün bağlı görev varsa sıfırdır", () => {
    const days = daysSinceGoalTask(
      progress,
      [{ goalId: "g1", dueDate: d("2026-08-19") }],
      d("2026-08-19"),
    );

    expect(days).toBe(0);
  });

  it("tarihsiz bağlı görevi saymaz", () => {
    const days = daysSinceGoalTask(
      progress,
      [{ goalId: "g1", dueDate: null }],
      d("2026-08-19"),
    );

    expect(days).toBeNull();
  });
});
