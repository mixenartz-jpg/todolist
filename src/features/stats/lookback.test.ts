import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import {
  entriesOn,
  noEntries,
  routine,
  task,
} from "@/features/testing/fixtures";
import { buildWeekLookback, lastWeekRange } from "./lookback";

const d = asDateStr;

// 2026-08-19 Carsamba. Bu hafta 17-23, GECEN hafta 10-16.
const TODAY = d("2026-08-19");

describe("lastWeekRange", () => {
  it("gecen ISO haftasini verir", () => {
    const range = lastWeekRange(TODAY);

    expect(range.start).toBe("2026-08-10");
    expect(range.end).toBe("2026-08-16");
  });

  it("Pazartesi gunu de gecen haftayi verir", () => {
    const range = lastWeekRange(d("2026-08-17"));

    expect(range.start).toBe("2026-08-10");
    expect(range.end).toBe("2026-08-16");
  });

  it("Pazar gunu hala ayni haftayi kapatir", () => {
    const range = lastWeekRange(d("2026-08-23"));

    expect(range.start).toBe("2026-08-10");
    expect(range.end).toBe("2026-08-16");
  });
});

describe("buildWeekLookback", () => {
  it("gecen haftaya tarihlenen gorevleri sayar", () => {
    const view = buildWeekLookback(
      noEntries,
      [],
      [
        task({ dueDate: "2026-08-12", done: true }),
        task({ dueDate: "2026-08-14", done: false }),
        // Bu hafta -- sayilmamali.
        task({ dueDate: "2026-08-19", done: true }),
      ],
      TODAY,
    );

    expect(view.taskTotal).toBe(2);
    expect(view.taskDone).toBe(1);
  });

  it("tarihsiz gorevi saymaz", () => {
    const view = buildWeekLookback(
      noEntries,
      [],
      [task({ dueDate: null, done: true })],
      TODAY,
    );

    expect(view.taskTotal).toBe(0);
  });

  /*
   * null != 0: olculmeyen bir haftayi "%0" diye gostermek, yapilacak
   * bir sey olmadigi halde yapilmamis gibi gostermektir.
   */
  it("hic zorunlu rutin yoksa oran NULL doner", () => {
    const view = buildWeekLookback(noEntries, [], [], TODAY);

    expect(view.routineRatio).toBeNull();
  });

  it("rutin doluluk oranini hesaplar", () => {
    const r = routine({ schedule: { kind: "daily" } });
    // Gecen haftanin 7 gununden 3'u isaretli.
    const e = entriesOn(r, {
      "2026-08-10": 1,
      "2026-08-11": 1,
      "2026-08-12": 1,
    });

    const view = buildWeekLookback(e, [r], [], TODAY);

    expect(view.routineRatio).toBeCloseTo(3 / 7, 3);
  });

  it("kusursuz gunleri sayar", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const e = entriesOn(r, { "2026-08-10": 1, "2026-08-11": 1 });

    const view = buildWeekLookback(e, [r], [], TODAY);

    expect(view.perfectDays).toBe(2);
  });

  it("bu haftanin isaretlerini SAYMAZ", () => {
    const r = routine({ schedule: { kind: "daily" } });
    const e = entriesOn(r, { "2026-08-19": 1 });

    const view = buildWeekLookback(e, [r], [], TODAY);

    expect(view.perfectDays).toBe(0);
    expect(view.routineRatio).toBe(0);
  });

  it("sinirlari cikti olarak verir", () => {
    const view = buildWeekLookback(noEntries, [], [], TODAY);

    expect(view.start).toBe("2026-08-10");
    expect(view.end).toBe("2026-08-16");
  });
});
