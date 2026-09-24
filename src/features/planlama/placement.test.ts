import { describe, expect, it } from "vitest";
import { asDateStr } from "@/lib/date/date";
import {
  isPlacingNode,
  isPlacingTask,
  placementLabel,
  resolveDropDate,
} from "./placement";

const d = asDateStr;

describe("isPlacingTask / isPlacingNode", () => {
  it("görev yerleştirmeyi tanır", () => {
    const placing = { kind: "task", id: "t1" } as const;

    expect(isPlacingTask(placing)).toBe(true);
    expect(isPlacingNode(placing)).toBe(false);
  });

  it("düğüm yerleştirmeyi tanır", () => {
    const placing = { kind: "node", id: "n1" } as const;

    expect(isPlacingNode(placing)).toBe(true);
    expect(isPlacingTask(placing)).toBe(false);
  });

  it("boş kipte ikisi de false", () => {
    expect(isPlacingTask(null)).toBe(false);
    expect(isPlacingNode(null)).toBe(false);
  });
});

describe("resolveDropDate", () => {
  it("hafta ölçeğinde tarihi AYNEN döner", () => {
    expect(resolveDropDate(d("2026-10-14"), "week")).toBe(d("2026-10-14"));
  });

  it("ay ölçeğinde de tarihi aynen döner — hücre zaten bir gün", () => {
    expect(resolveDropDate(d("2026-10-14"), "month")).toBe(d("2026-10-14"));
  });

  it("hafta hücresine bırakmayı o haftanın PAZARTESİSİNE çözer", () => {
    // Ay ölçeğinde bırakma hedefi bir hafta şeridi olabilir; "şu
    // haftaya" demek pratikte "haftanın başına" demektir ve hedef
    // kartı bunu yazıyor ("Pazartesi'ye").
    expect(resolveDropDate(d("2026-10-14"), "week-cell")).toBe(d("2026-10-12"));
  });

  it("zaten pazartesi olan hafta hücresini değiştirmez", () => {
    expect(resolveDropDate(d("2026-10-12"), "week-cell")).toBe(d("2026-10-12"));
  });

  it("pazar gününü AYNI haftanın pazartesisine çeker", () => {
    // ISO haftası pazartesi başlar; pazar o haftanın SON günü.
    // `startOfIsoWeek` kullanılmasaydı pazar bir sonraki haftaya
    // kayardı ve kullanıcı bıraktığı yerden bir hafta ileri giderdi.
    expect(resolveDropDate(d("2026-10-18"), "week-cell")).toBe(d("2026-10-12"));
  });
});

describe("placementLabel", () => {
  it("görev yerleştirmede taşıma dilini kullanır", () => {
    expect(placementLabel({ kind: "task", id: "t1" }, "week")).toBe(
      "Görevi bir güne taşı",
    );
  });

  it("düğüm yerleştirmede GÖREV ÜRETME dilini kullanır", () => {
    // Fark önemli: görev TAŞINIR, düğümden görev DOĞAR. Aynı cümleyi
    // kullanmak, kullanıcıya ağaçtaki başlığın kaybolacağını
    // düşündürürdü.
    expect(placementLabel({ kind: "node", id: "n1" }, "week")).toBe(
      "Başlığı bir güne gönder",
    );
  });

  it("hafta hücresinde pazartesiye düşeceğini SÖYLER", () => {
    expect(placementLabel({ kind: "node", id: "n1" }, "week-cell")).toBe(
      "Başlığı bir haftaya gönder — pazartesiye düşer",
    );
  });

  it("boş kipte boş metin döner", () => {
    expect(placementLabel(null, "week")).toBe("");
  });
});
