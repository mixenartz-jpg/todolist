import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { category, planGoal, task } from "@/features/testing/fixtures";
import { buildMonthRollup, goalProgress, monthDayLoads } from "./rollup";

const d = asDateStr;

/** Ağustos 2026 — 31 gün. */
const AUG = d("2026-08-01");
const AUG_MID = d("2026-08-12");
/** Ağustos bittikten sonraki bir gün: tüm ay sayılır. */
const AFTER_AUG = d("2026-09-15");

it("fixture varsayımı: Ağustos 31 gün", () => {
  // Aşağıdaki gün sayıları bu varsayıma dayanıyor.
  expect(monthDayLoads([], AUG)).toHaveLength(31);
});

describe("goalProgress", () => {
  it("sayısal hedef bağlı görevleri YENER", () => {
    /*
     * Kullanıcı bir sayı yazdıysa ölçüyü o seçmiştir: "30 deneme"
     * hedefine üç görev bağlamak, hedefin 3'te 1'i demek değildir.
     */
    const goal = planGoal({ id: "g1", targetCount: 10, doneCount: 4 });
    const tasks = [
      task({ goalId: "g1", done: true }),
      task({ goalId: "g1" }),
      task({ goalId: "g1" }),
    ];

    const progress = goalProgress(goal, tasks);

    expect(progress.source).toBe("count");
    expect(progress.ratio).toBeCloseTo(0.4);
    // Görev sayıları yine de raporlanır — arayüz ikisini de gösterebilir.
    expect(progress.taskTotal).toBe(3);
    expect(progress.taskDone).toBe(1);
  });

  it("sayısal hedef yoksa ilerleme bağlı görevlerden okunur", () => {
    const goal = planGoal({ id: "g1", targetCount: null });
    const tasks = [
      task({ goalId: "g1", done: true }),
      task({ goalId: "g1" }),
      task({ goalId: "g1" }),
    ];

    const progress = goalProgress(goal, tasks);

    expect(progress.source).toBe("tasks");
    expect(progress.ratio).toBeCloseTo(1 / 3);
  });

  it("ne sayı ne görev varsa ratio NULL — sıfır değil", () => {
    /*
     * `0` göstermek "hiç başlamadın" der; doğrusu "ölçülmüyor". Arayüz
     * ikisini farklı çizmeli, bu yüzden tip de ayırır.
     */
    const progress = goalProgress(planGoal({ targetCount: null }), []);

    expect(progress.ratio).toBeNull();
    expect(progress.source).toBe("none");
  });

  it("hedefi aşan sayaç 1'de kırpılır", () => {
    // "%150 tamamlandı" anlamsız bir ilerleme çubuğu olurdu.
    const goal = planGoal({ targetCount: 10, doneCount: 15 });
    expect(goalProgress(goal, []).ratio).toBe(1);
  });

  it("TARİHSİZ görev de hedefe bağlıysa sayılır", () => {
    // Hedef AYA aittir ama ona bağlı iş tarihsiz olabilir.
    const goal = planGoal({ id: "g1", targetCount: null });
    const progress = goalProgress(goal, [
      task({ goalId: "g1", dueDate: null, done: true }),
    ]);

    expect(progress.taskTotal).toBe(1);
    expect(progress.ratio).toBe(1);
  });

  it("başka hedefin görevlerini saymaz", () => {
    const goal = planGoal({ id: "g1", targetCount: null });
    const progress = goalProgress(goal, [task({ goalId: "g2" })]);

    expect(progress.taskTotal).toBe(0);
  });
});

describe("buildMonthRollup", () => {
  it("boş girdide completionRatio NULL döner", () => {
    // 0/0 sıfır değildir; "hiç iş yok" ile "hiçbirini bitirmedim"
    // farklı durumlardır.
    const rollup = buildMonthRollup([], [], [], AUG, AFTER_AUG);

    expect(rollup.taskTotal).toBe(0);
    expect(rollup.completionRatio).toBeNull();
    expect(rollup.categories).toEqual([]);
    expect(rollup.emptyDays).toBe(31);
  });

  it("ay içi görevleri sayar, komşu ayı SAYMAZ", () => {
    const rollup = buildMonthRollup(
      [
        task({ dueDate: "2026-08-05", done: true }),
        task({ dueDate: "2026-08-06" }),
        task({ dueDate: "2026-07-31" }),
        task({ dueDate: "2026-09-01" }),
      ],
      [],
      [],
      AUG,
      AFTER_AUG,
    );

    expect(rollup.taskTotal).toBe(2);
    expect(rollup.taskDone).toBe(1);
    expect(rollup.completionRatio).toBeCloseTo(0.5);
  });

  it("TARİHSİZ görev ay toplamına girmez ama hedefe bağlıysa sayılır", () => {
    const rollup = buildMonthRollup(
      [task({ dueDate: null, goalId: "g1", done: true })],
      [planGoal({ id: "g1", targetCount: null })],
      [],
      AUG,
      AFTER_AUG,
    );

    expect(rollup.taskTotal).toBe(0);
    expect(rollup.goals[0].taskTotal).toBe(1);
    expect(rollup.goals[0].ratio).toBe(1);
  });

  it("süreyi yalnızca saati OLAN işlerden toplar", () => {
    const rollup = buildMonthRollup(
      [
        task({ dueDate: "2026-08-05", startTime: "09:00", durationMinutes: 60 }),
        task({ dueDate: "2026-08-06", startTime: null, durationMinutes: 45 }),
      ],
      [],
      [],
      AUG,
      AFTER_AUG,
    );

    expect(rollup.totalMinutes).toBe(60);
  });

  describe("boş gün sayımı", () => {
    it("ay ortasındayken YALNIZCA bugüne kadar sayar", () => {
      /*
       * 12 Ağustos'ta "19 boş gün" göstermek yanlıştır — o günler
       * henüz gelmedi. Eşik min(ay sonu, bugün).
       */
      const rollup = buildMonthRollup(
        [task({ dueDate: "2026-08-05" })],
        [],
        [],
        AUG,
        AUG_MID,
      );

      expect(rollup.countedDays).toBe(12);
      expect(rollup.activeDays).toBe(1);
      expect(rollup.emptyDays).toBe(11);
    });

    it("geçmiş bir ayda tüm ay sayılır", () => {
      const rollup = buildMonthRollup(
        [task({ dueDate: "2026-08-05" })],
        [],
        [],
        AUG,
        AFTER_AUG,
      );

      expect(rollup.countedDays).toBe(31);
      expect(rollup.emptyDays).toBe(30);
    });

    it("GELECEK bir ayda hiçbir gün sayılmaz", () => {
      // "31 boş gün" demek, henüz planlanmamış bir ayı başarısızlık
      // gibi göstermekti.
      const rollup = buildMonthRollup([], [], [], d("2026-12-01"), AUG_MID);

      expect(rollup.countedDays).toBe(0);
      expect(rollup.emptyDays).toBe(0);
    });

    it("aynı güne iki iş, günü BİR kez aktif sayar", () => {
      const rollup = buildMonthRollup(
        [task({ dueDate: "2026-08-05" }), task({ dueDate: "2026-08-05" })],
        [],
        [],
        AUG,
        AFTER_AUG,
      );

      expect(rollup.activeDays).toBe(1);
    });
  });

  describe("kategori dağılımı", () => {
    const mat = category({ id: "mat", name: "Matematik" });
    const spor = category({ id: "spor", name: "Spor" });

    it("dilim paylarının toplamı 1'dir", () => {
      /*
       * Tek FK garantisinin ta kendisi: bir görev iki dilime birden
       * sayılsaydı toplam 1'i aşar ve grafik yalan söylerdi.
       */
      const rollup = buildMonthRollup(
        [
          task({ dueDate: "2026-08-05", categoryId: "mat" }),
          task({ dueDate: "2026-08-06", categoryId: "spor" }),
          task({ dueDate: "2026-08-07", categoryId: null }),
        ],
        [],
        [mat, spor],
        AUG,
        AFTER_AUG,
      );

      const total = rollup.categories.reduce((sum, s) => sum + s.share, 0);
      expect(total).toBeCloseTo(1);
    });

    it("kategorisizler kovası HER ZAMAN sonda ve category null", () => {
      const rollup = buildMonthRollup(
        [
          task({ dueDate: "2026-08-05", categoryId: null }),
          task({ dueDate: "2026-08-06", categoryId: null }),
          task({ dueDate: "2026-08-07", categoryId: "mat" }),
        ],
        [],
        [mat],
        AUG,
        AFTER_AUG,
      );

      const last = rollup.categories[rollup.categories.length - 1];
      expect(last.category).toBeNull();
      expect(last.taskTotal).toBe(2);
    });

    it("dilimleri iş sayısına göre azalan sıralar", () => {
      const rollup = buildMonthRollup(
        [
          task({ dueDate: "2026-08-05", categoryId: "spor" }),
          task({ dueDate: "2026-08-06", categoryId: "mat" }),
          task({ dueDate: "2026-08-07", categoryId: "mat" }),
        ],
        [],
        [mat, spor],
        AUG,
        AFTER_AUG,
      );

      expect(rollup.categories.map((s) => s.category?.id)).toEqual([
        "mat",
        "spor",
      ]);
    });

    it("ARŞİVLENMİŞ kategori geçmiş görevleri yüzünden dilimde kalır", () => {
      // Arşiv bir görünürlük kararıdır; geçmiş değişmez.
      const archived = category({
        id: "eski",
        name: "Eski",
        archivedAt: "2026-07-01T00:00:00Z",
      });

      const rollup = buildMonthRollup(
        [task({ dueDate: "2026-08-05", categoryId: "eski" })],
        [],
        [archived],
        AUG,
        AFTER_AUG,
      );

      expect(rollup.categories[0].category?.id).toBe("eski");
    });

    it("silinmiş kategoriye bağlı görev kategorisizler kovasına düşer", () => {
      // Üçüncü bir "bilinmeyen" durumu yaratmaktansa geri kalana katmak.
      const rollup = buildMonthRollup(
        [
          task({ dueDate: "2026-08-05", categoryId: "yok" }),
          task({ dueDate: "2026-08-06", categoryId: null }),
        ],
        [],
        [],
        AUG,
        AFTER_AUG,
      );

      expect(rollup.categories).toHaveLength(1);
      expect(rollup.categories[0].category).toBeNull();
      expect(rollup.categories[0].taskTotal).toBe(2);
    });

    it("dilim süresini yalnızca saatli işlerden toplar", () => {
      const rollup = buildMonthRollup(
        [
          task({
            dueDate: "2026-08-05",
            categoryId: "mat",
            startTime: "09:00",
            durationMinutes: 90,
          }),
          task({ dueDate: "2026-08-06", categoryId: "mat" }),
        ],
        [],
        [mat],
        AUG,
        AFTER_AUG,
      );

      expect(rollup.categories[0].minutes).toBe(90);
      expect(rollup.categories[0].taskTotal).toBe(2);
    });
  });
});

describe("monthDayLoads", () => {
  it("ayın her günü için bir kayıt döner", () => {
    const loads = monthDayLoads([task({ dueDate: "2026-08-05" })], AUG);

    expect(loads).toHaveLength(31);
    expect(loads[0].date).toBe(AUG);
    expect(loads[4]).toEqual({ date: d("2026-08-05"), total: 1, done: 0 });
  });

  it("komşu ayın görevlerini saymaz", () => {
    const loads = monthDayLoads([task({ dueDate: "2026-09-01" })], AUG);

    expect(loads.every((l) => l.total === 0)).toBe(true);
  });

  it("tarihsiz görevi saymaz", () => {
    const loads = monthDayLoads([task({ dueDate: null })], AUG);

    expect(loads.every((l) => l.total === 0)).toBe(true);
  });
});
