import { describe, expect, it } from "vitest";
import { allActions, defaultAction, resultFormKind, wantsFeynman } from "./actions";

const t = (o: { action?: string | null; routineId?: string | null; title?: string; targetAmount?: number | null }) => ({
  action: o.action ?? null,
  routineId: o.routineId ?? null,
  title: o.title ?? "X",
  targetAmount: o.targetAmount ?? null,
});

describe("eylemler", () => {
  it("varsayılan eylem kaynak türünden", () => {
    expect(defaultAction("kitap")).toBe("Çöz + Analiz");
    expect(defaultAction("video")).toBe("İzle + Feynman");
  });
  it("koçun eylemleri eklenir, tekrar edenler atılır", () => {
    expect(allActions(["Hızlı Tarama", "çöz", " "])).toEqual([
      "Çöz", "Çöz + Analiz", "İzle", "İzle + Feynman", "Tekrar", "İlerlet", "Hızlı Tarama",
    ]);
  });
  it("sonuç formu eyleme göre", () => {
    expect(resultFormKind(t({ action: "Çöz + Analiz" }))).toBe("solve");
    expect(resultFormKind(t({ action: "Tekrar" }))).toBe("solve");
    expect(resultFormKind(t({ action: "İZLE + FEYNMAN" }))).toBe("watch");
    expect(resultFormKind(t({ action: "İlerlet", targetAmount: 10 }))).toBe("progress");
    expect(resultFormKind(t({ routineId: "r" }))).toBe("routine");
    expect(resultFormKind(t({ title: "Rutin | Paragraf" }))).toBe("routine");
    expect(resultFormKind(t({}))).toBe("solve");
    expect(wantsFeynman(t({ action: "İzle + Feynman" }))).toBe(true);
    expect(wantsFeynman(t({ action: "İzle" }))).toBe(false);
  });
});
