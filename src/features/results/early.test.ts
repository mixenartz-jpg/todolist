import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import { earlyDoneOn, earlyLabel } from "./early";

const d = asDateStr;

describe("earlyDoneOn — done_on ile erken yapılma", () => {
  it("planlanan günden önce yapılan görev erkendir", () => {
    expect(earlyDoneOn({ date: d("2026-11-15"), doneOn: d("2026-11-14"), status: "done" })).toBe("2026-11-14");
    expect(earlyDoneOn({ date: d("2026-11-16"), doneOn: d("2026-11-14"), status: "partial" })).toBe("2026-11-14");
  });

  it("aynı gün ya da geç yapılan görev erken değildir", () => {
    expect(earlyDoneOn({ date: d("2026-11-14"), doneOn: d("2026-11-14"), status: "done" })).toBeNull();
    expect(earlyDoneOn({ date: d("2026-11-13"), doneOn: d("2026-11-14"), status: "done" })).toBeNull();
  });

  it("yapılmadı/durumsuz ya da damgasız sonuç erken sayılmaz", () => {
    expect(earlyDoneOn({ date: d("2026-11-15"), doneOn: d("2026-11-14"), status: "skipped" })).toBeNull();
    expect(earlyDoneOn({ date: d("2026-11-15"), doneOn: d("2026-11-14"), status: null })).toBeNull();
    expect(earlyDoneOn({ date: d("2026-11-15"), doneOn: null, status: "done" })).toBeNull();
    expect(earlyDoneOn(undefined)).toBeNull();
  });

  it("rozet metni", () => {
    expect(earlyLabel(d("2026-11-14"))).toBe("erken yapıldı (14 Kas)");
  });
});
