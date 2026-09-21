import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { task } from "@/features/testing/fixtures";
import {
  carriedCount,
  carriedDays,
  EVENING_HOUR,
  isEvening,
  suggestedTomorrowLoad,
  tomorrow,
} from "./evening";

const TODAY = asDateStr("2026-08-19");

describe("isEvening", () => {
  it("esikten once kapalidir", () => {
    expect(isEvening(EVENING_HOUR - 1)).toBe(false);
    expect(isEvening(12)).toBe(false);
  });

  it("esikte ve sonrasinda aciktir", () => {
    expect(isEvening(EVENING_HOUR)).toBe(true);
    expect(isEvening(23)).toBe(true);
  });

  /*
   * 00:30'da hala ayakta olan biri icin gun bitmemistir; davetin
   * kaybolmasi tam da onu en cok kullanacak kisiden kacirmak olurdu.
   */
  it("gece yarisindan sonra HALA aciktir", () => {
    expect(isEvening(0)).toBe(true);
    expect(isEvening(3)).toBe(true);
  });

  it("sabah 4'te kapanir", () => {
    expect(isEvening(4)).toBe(false);
    expect(isEvening(9)).toBe(false);
  });
});

describe("carriedCount", () => {
  it("gecmisten devreden ACIK isleri sayar", () => {
    const count = carriedCount(
      [
        task({ dueDate: "2026-08-18", done: false }),
        task({ dueDate: "2026-08-17", done: false }),
        task({ dueDate: TODAY, done: false }),
      ],
      TODAY,
    );

    expect(count).toBe(2);
  });

  it("bitmis gecikmisi saymaz", () => {
    const count = carriedCount(
      [task({ dueDate: "2026-08-18", done: true })],
      TODAY,
    );

    expect(count).toBe(0);
  });

  it("tarihsiz isi saymaz", () => {
    expect(carriedCount([task({ dueDate: null })], TODAY)).toBe(0);
  });
});

describe("suggestedTomorrowLoad", () => {
  it("tasima yoksa tabani verir", () => {
    expect(suggestedTomorrowLoad(0)).toBe(5);
  });

  it("her tasinan is bir azaltir", () => {
    expect(suggestedTomorrowLoad(2)).toBe(3);
  });

  /*
   * "Yarina 0 is koy" bir oneri degil, bir vazgecme cagrisi olurdu.
   */
  it("alt sinir 2'dir", () => {
    expect(suggestedTomorrowLoad(9)).toBe(2);
    expect(suggestedTomorrowLoad(100)).toBe(2);
  });
});

describe("carriedDays", () => {
  it("tasinan gun sayisini POZITIF verir", () => {
    const days = carriedDays(task({ dueDate: "2026-08-15" }), TODAY);

    expect(days).toBe(4);
  });

  it("bugune ait iste null doner", () => {
    expect(carriedDays(task({ dueDate: TODAY }), TODAY)).toBeNull();
  });

  it("gelecekteki iste null doner", () => {
    expect(carriedDays(task({ dueDate: "2026-08-25" }), TODAY)).toBeNull();
  });

  it("bitmis iste null doner", () => {
    expect(
      carriedDays(task({ dueDate: "2026-08-15", done: true }), TODAY),
    ).toBeNull();
  });

  it("tarihsiz iste null doner", () => {
    expect(carriedDays(task({ dueDate: null }), TODAY)).toBeNull();
  });
});

describe("tomorrow", () => {
  it("bir sonraki gunu verir", () => {
    expect(tomorrow(TODAY)).toBe("2026-08-20");
  });

  it("ay sonunu asar", () => {
    expect(tomorrow(asDateStr("2026-08-31"))).toBe("2026-09-01");
  });
});
