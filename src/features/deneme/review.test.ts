import { describe, expect, test } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { denemeYanlis } from "@/features/testing/fixtures";
import {
  advanceReview,
  asamaEtiketi,
  vadesiGelenler,
  GRADUATED_STAGE,
  initialReviewState,
  isDue,
  isGraduated,
  type ReviewState,
} from "./review";

const d = asDateStr;

describe("initialReviewState", () => {
  test("ilk vade ertesi gündür", () => {
    expect(initialReviewState(d("2026-08-01"))).toEqual({
      stage: 0,
      nextReviewDate: "2026-08-02",
    });
  });
});

describe("advanceReview", () => {
  test("merdiven 1 → 3 → 7 → 21 gün üretir", () => {
    // Her adımda aynı gün tekrar edildiği varsayımıyla ilerlet.
    let state = initialReviewState(d("2026-08-01"));
    expect(state.nextReviewDate).toBe("2026-08-02");

    state = advanceReview(state, d("2026-08-02"));
    expect(state).toEqual({ stage: 1, nextReviewDate: "2026-08-05" }); // +3

    state = advanceReview(state, d("2026-08-05"));
    expect(state).toEqual({ stage: 2, nextReviewDate: "2026-08-12" }); // +7

    state = advanceReview(state, d("2026-08-12"));
    expect(state).toEqual({ stage: 3, nextReviewDate: "2026-09-02" }); // +21

    state = advanceReview(state, d("2026-09-02"));
    expect(state).toEqual({ stage: GRADUATED_STAGE, nextReviewDate: null });
  });

  test("vade TEKRARIN yapıldığı günden hesaplanır, orijinal tarihten değil", () => {
    // Asıl tuzak: 1'inde kaydedip 20'sine kadar açmayan biri stage 0'ı
    // işaretlediğinde sonraki vade 23'ü olmalı — 4'ü olsaydı anında
    // yeniden vadesi gelirdi.
    const state = initialReviewState(d("2026-08-01"));
    const next = advanceReview(state, d("2026-08-20"));

    expect(next.nextReviewDate).toBe("2026-08-23");
    expect(next.nextReviewDate).not.toBe("2026-08-04");
  });

  test("mezun durumdan ilerletmek idempotenttir", () => {
    const graduated: ReviewState = {
      stage: GRADUATED_STAGE,
      nextReviewDate: null,
    };

    const next = advanceReview(graduated, d("2026-09-10"));

    expect(next).toEqual(graduated);
    expect(next.stage).not.toBe(0); // 0'a sarmaz
  });
});

describe("isGraduated", () => {
  test("null vade mezun demektir", () => {
    expect(isGraduated({ stage: 4, nextReviewDate: null })).toBe(true);
    expect(isGraduated({ stage: 2, nextReviewDate: d("2026-08-10") })).toBe(false);
  });
});

describe("isDue", () => {
  const today = d("2026-08-10");

  test("bugün vadesi gelen due'dur", () => {
    expect(isDue({ stage: 1, nextReviewDate: d("2026-08-10") }, today)).toBe(true);
  });

  test("geçmiş vade de due'dur — kaçırılan tekrar kaybolmaz", () => {
    expect(isDue({ stage: 1, nextReviewDate: d("2026-07-20") }, today)).toBe(true);
  });

  test("gelecek vade due değildir", () => {
    expect(isDue({ stage: 1, nextReviewDate: d("2026-08-11") }, today)).toBe(false);
  });

  test("mezun asla due değildir", () => {
    expect(isDue({ stage: 4, nextReviewDate: null }, today)).toBe(false);
  });
});

describe("vadesiGelenler", () => {
  const today = d("2026-08-10");

  test("en eski vade önce sıralanır", () => {
    const list = [
      denemeYanlis({ id: "b", nextReviewDate: "2026-08-09" }),
      denemeYanlis({ id: "a", nextReviewDate: "2026-08-01" }),
      denemeYanlis({ id: "c", nextReviewDate: "2026-08-10" }),
    ];

    expect(vadesiGelenler(list, today).map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  test("mezun ve vadesi gelmemişler hariç tutulur", () => {
    const list = [
      denemeYanlis({ id: "due", nextReviewDate: "2026-08-10" }),
      denemeYanlis({ id: "mezun", reviewStage: 4, nextReviewDate: null }),
      denemeYanlis({ id: "sonra", nextReviewDate: "2026-08-20" }),
    ];

    expect(vadesiGelenler(list, today).map((m) => m.id)).toEqual(["due"]);
  });

  test("eşit vadede sıra id ile kararlıdır", () => {
    const list = [
      denemeYanlis({ id: "z", nextReviewDate: "2026-08-09" }),
      denemeYanlis({ id: "a", nextReviewDate: "2026-08-09" }),
    ];

    expect(vadesiGelenler(list, today).map((m) => m.id)).toEqual(["a", "z"]);
  });

  test("boş girdi boş döner", () => {
    expect(vadesiGelenler([], today)).toEqual([]);
  });
});

describe("asamaEtiketi", () => {
  test("stage 0 ilk tekrarı bekler — '1. tekrar' yazar", () => {
    /*
     * `review_stage` TAMAMLANAN tekrar sayısı. Bire eklemeden
     * yazılsaydı kullanıcı "0. tekrar" görürdü — tek satırlık bir
     * kayma, yanlış bir ilerleme anlatır.
     */
    expect(asamaEtiketi(0)).toBe("1. tekrar · 1 gün aralık");
  });

  test("aralık o aşamanın merdiven adımıdır", () => {
    expect(asamaEtiketi(1)).toBe("2. tekrar · 3 gün aralık");
    expect(asamaEtiketi(2)).toBe("3. tekrar · 7 gün aralık");
    expect(asamaEtiketi(3)).toBe("4. tekrar · 21 gün aralık");
  });

  test("mezun aşamada gösterilecek sonraki aralık yok", () => {
    expect(asamaEtiketi(GRADUATED_STAGE)).toBe("Son tekrar");
  });
});
