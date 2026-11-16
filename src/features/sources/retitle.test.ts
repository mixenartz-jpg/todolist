import { describe, expect, it } from "vitest";
import { retitleTasks, treeFromOps } from "./retitle";
import { parseToc } from "./toc";
import { buildDraft, diffTree } from "./tree";
import type { SourceDraft, SourceTree } from "./types";

const BOOK = { kind: "kitap", unit: "test" } as const;
const DRAFT: SourceDraft = {
  title: "Güçlendiren Matematik",
  kind: "kitap",
  publisher: null,
  subject: "Matematik",
  exam: "LGS",
  level: null,
  unit: "test",
  minutesPerUnit: 20,
};

function ids(prefix: string) {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

function save(text: string, previous: SourceTree | null): SourceTree {
  const newId = ids(previous ? "b" : "a");
  const draft = buildDraft(parseToc(text, BOOK), previous?.series ?? [], [], { subject: null, exam: null, newId });
  const ops = diffTree("src", "test", draft, previous?.series ?? [], newId);
  return treeFromOps("src", DRAFT, ops, previous);
}

const OLD = save("Çarpanlar ve Katlar | 1-7\nÜslü İfadeler | 8-16\nKareköklü İfadeler | 17-27", null);
const NEW = save("Çarpanlar ve Katlar | 7 test\nÜslü İfadeler | 9 test\nKareköklü İfadeler | 11 test", OLD);
const items = (tree: SourceTree, label: string, numbers: number[]) =>
  tree.series[0].sections.find((s) => s.label === label)!.items.filter((i) => numbers.includes(i.number)).map((i) => i.id);

describe("retitleTasks", () => {
  const linked = items(OLD, "Üslü İfadeler", [14, 15, 16]);
  const task = { id: "t1", title: "Güçlendiren Matematik | Üslü İfadeler | 14 - 16. Testler | Çöz + Analiz", action: "Çöz + Analiz", itemIds: linked };

  it("1'den numaralanınca bağlı görevin başlığı yeni numaraya geçer", () => {
    expect(items(NEW, "Üslü İfadeler", [7, 8, 9])).toEqual(linked);
    expect(retitleTasks(OLD, NEW, [], [task])).toEqual([
      { id: "t1", title: "Güçlendiren Matematik | Üslü İfadeler | 7 - 9. Testler | Çöz + Analiz" },
    ]);
  });

  it("dönüştürülüp önceden kaydedilmiş kaynakta da düzelir (yeniden kaydet)", () => {
    expect(retitleTasks(NEW, NEW, [], [task])).toEqual([
      { id: "t1", title: "Güçlendiren Matematik | Üslü İfadeler | 7 - 9. Testler | Çöz + Analiz" },
    ]);
  });

  it("elle değiştirilmiş başlık, eylemsiz görev ve değişmeyen başlık dokunulmaz", () => {
    expect(
      retitleTasks(OLD, NEW, [], [
        { ...task, title: "Üslü tekrar — 14-16" },
        { ...task, action: null },
        { ...task, title: "Güçlendiren Matematik | Üslü İfadeler | 7 - 9. Testler | Çöz + Analiz" },
      ]),
    ).toEqual([]);
  });

  it("bağlı test silinmişse dokunulmaz", () => {
    expect(retitleTasks(OLD, NEW, [], [{ ...task, itemIds: [...linked, "yok"] }])).toEqual([]);
  });
});
