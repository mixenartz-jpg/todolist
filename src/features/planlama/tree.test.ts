import { describe, expect, it } from "vitest";
import { goalNode } from "@/features/testing/fixtures";
import {
  ancestorChain,
  buildGoalTree,
  canMoveNode,
  flattenGoalTree,
  nextSiblingOrder,
  nodeEdit,
  reorderSiblings,
  subtreeHeight,
  subtreeIds,
  treeKeyAction,
} from "./tree";

const NONE = new Set<string>();

/**
 * Üç seviyeli örnek ağaç — kullanıcının kimya örneğinin birebir
 * karşılığı. Testlerin çoğu bunun üstünde çalışır.
 *
 *   asit (1)
 *   ├─ konu (2)
 *   └─ soru (2)
 *      └─ bank (3)
 *   tepkime (1)
 */
function kimya() {
  return [
    goalNode({ id: "asit", title: "Asitler-Bazlar", depth: 1, sortOrder: 0 }),
    goalNode({ id: "konu", parentId: "asit", title: "Konu anlatımı", depth: 2, sortOrder: 0 }),
    goalNode({ id: "soru", parentId: "asit", title: "Soru bankası", depth: 2, sortOrder: 1 }),
    goalNode({ id: "bank", parentId: "soru", title: "50 soru", depth: 3, sortOrder: 0 }),
    goalNode({ id: "tepkime", title: "Tepkimeler", depth: 1, sortOrder: 1 }),
  ];
}

describe("buildGoalTree", () => {
  it("düz satırları iç içe ağaca çevirir", () => {
    const tree = buildGoalTree(kimya());

    expect(tree.map((t) => t.node.id)).toEqual(["asit", "tepkime"]);
    expect(tree[0].children.map((c) => c.node.id)).toEqual(["konu", "soru"]);
    expect(tree[0].children[1].children.map((c) => c.node.id)).toEqual(["bank"]);
  });

  it("kardeşleri sortOrder'a göre sıralar", () => {
    const tree = buildGoalTree([
      goalNode({ id: "b", sortOrder: 1 }),
      goalNode({ id: "a", sortOrder: 0 }),
    ]);

    expect(tree.map((t) => t.node.id)).toEqual(["a", "b"]);
  });

  it("ebeveyni bulunmayan satırı ATAR — yarım ağaç çizilmez", () => {
    const tree = buildGoalTree([
      goalNode({ id: "kok" }),
      goalNode({ id: "yetim", parentId: "silinmis", depth: 2 }),
    ]);

    expect(tree.map((t) => t.node.id)).toEqual(["kok"]);
  });

  it("boş listede boş ağaç döner", () => {
    expect(buildGoalTree([])).toEqual([]);
  });
});

describe("flattenGoalTree", () => {
  it("ağacı ekran sırasına düzler — derinlik öncelikli", () => {
    const flat = flattenGoalTree(buildGoalTree(kimya()), NONE);

    expect(flat.map((f) => f.node.id)).toEqual([
      "asit",
      "konu",
      "soru",
      "bank",
      "tepkime",
    ]);
  });

  it("katlanmış düğümün ALTINI düzlemez", () => {
    const flat = flattenGoalTree(buildGoalTree(kimya()), new Set(["asit"]));

    expect(flat.map((f) => f.node.id)).toEqual(["asit", "tepkime"]);
  });

  it("aria için level, setsize ve posinset üretir", () => {
    const flat = flattenGoalTree(buildGoalTree(kimya()), NONE);
    const bank = flat.find((f) => f.node.id === "bank");

    expect(bank).toMatchObject({ level: 3, index: 0, siblingCount: 1 });
  });

  it("kardeş sayısını ve sırasını aynı ebeveyn içinde sayar", () => {
    const flat = flattenGoalTree(buildGoalTree(kimya()), NONE);
    const soru = flat.find((f) => f.node.id === "soru");

    expect(soru).toMatchObject({ level: 2, index: 1, siblingCount: 2 });
  });

  it("çocuğu olanı hasChildren ile işaretler", () => {
    const flat = flattenGoalTree(buildGoalTree(kimya()), NONE);

    expect(flat.find((f) => f.node.id === "asit")?.hasChildren).toBe(true);
    expect(flat.find((f) => f.node.id === "konu")?.hasChildren).toBe(false);
  });
});

describe("subtreeIds", () => {
  it("düğümü ve tüm altını döner", () => {
    expect(subtreeIds(kimya(), "asit").sort()).toEqual(
      ["asit", "bank", "konu", "soru"].sort(),
    );
  });

  it("yaprakta yalnız kendisini döner", () => {
    expect(subtreeIds(kimya(), "bank")).toEqual(["bank"]);
  });

  it("olmayan kimlikte boş dizi döner", () => {
    expect(subtreeIds(kimya(), "yok")).toEqual([]);
  });
});

describe("subtreeHeight", () => {
  it("yaprağın yüksekliği 1", () => {
    expect(subtreeHeight(kimya(), "bank")).toBe(1);
  });

  it("iki seviyeli dalın yüksekliği 2", () => {
    expect(subtreeHeight(kimya(), "soru")).toBe(2);
  });

  it("üç seviyeli dalın yüksekliği 3", () => {
    expect(subtreeHeight(kimya(), "asit")).toBe(3);
  });
});

describe("ancestorChain", () => {
  it("kökten kendisine kadar zinciri döner", () => {
    expect(ancestorChain(kimya(), "bank").map((n) => n.id)).toEqual([
      "asit",
      "soru",
      "bank",
    ]);
  });

  it("kök düğümde yalnız kendisini döner", () => {
    expect(ancestorChain(kimya(), "asit").map((n) => n.id)).toEqual(["asit"]);
  });
});

describe("canMoveNode", () => {
  it("geçerli taşımada null döner", () => {
    expect(canMoveNode(kimya(), "konu", "tepkime")).toBeNull();
  });

  it("köke taşımaya izin verir", () => {
    expect(canMoveNode(kimya(), "bank", null)).toBeNull();
  });

  it("olmayan düğümü reddeder", () => {
    expect(canMoveNode(kimya(), "yok", null)).toBe("not-found");
  });

  it("olmayan ebeveyni reddeder", () => {
    expect(canMoveNode(kimya(), "konu", "yok")).toBe("not-found");
  });

  it("kendi altına taşımayı reddeder — döngü", () => {
    expect(canMoveNode(kimya(), "asit", "soru")).toBe("cycle");
  });

  it("kendi üstüne taşımayı reddeder — döngü", () => {
    expect(canMoveNode(kimya(), "asit", "asit")).toBe("cycle");
  });

  it("dalı, yüksekliğiyle birlikte 3'ü aşacak yere taşımayı reddeder", () => {
    // "soru" iki seviyelik bir dal (soru + bank). "konu" depth 2;
    // altına taşınırsa bank depth 4 olurdu.
    expect(canMoveNode(kimya(), "soru", "konu")).toBe("too-deep");
  });

  it("yaprağı 3. seviyeye taşımaya izin verir — tam sınırda", () => {
    expect(canMoveNode(kimya(), "konu", "soru")).toBeNull();
  });

  it("yaprağı 3. seviyedeki düğümün altına taşımayı reddeder", () => {
    expect(canMoveNode(kimya(), "konu", "bank")).toBe("too-deep");
  });
});

describe("reorderSiblings", () => {
  it("kardeşi bir sıra aşağı taşır ve yalnızca değişenleri döner", () => {
    const patches = reorderSiblings(kimya(), "konu", 1);

    expect(patches).toEqual([
      { id: "soru", sortOrder: 0 },
      { id: "konu", sortOrder: 1 },
    ]);
  });

  it("kardeşi bir sıra yukarı taşır", () => {
    const patches = reorderSiblings(kimya(), "soru", -1);

    expect(patches).toEqual([
      { id: "soru", sortOrder: 0 },
      { id: "konu", sortOrder: 1 },
    ]);
  });

  it("ilk kardeşi yukarı taşımak boş dizi döner", () => {
    expect(reorderSiblings(kimya(), "konu", -1)).toEqual([]);
  });

  it("son kardeşi aşağı taşımak boş dizi döner", () => {
    expect(reorderSiblings(kimya(), "soru", 1)).toEqual([]);
  });

  it("olmayan kimlikte boş dizi döner", () => {
    expect(reorderSiblings(kimya(), "yok", 1)).toEqual([]);
  });

  it("YALNIZCA aynı ebeveynin kardeşlerini numaralar", () => {
    const patches = reorderSiblings(kimya(), "tepkime", -1);

    // Kök seviyesinde iki düğüm var: asit(0), tepkime(1). Takas sonrası
    // ikisi de değişir; "konu"/"soru"/"bank" hiç dokunulmaz.
    expect(patches.map((p) => p.id).sort()).toEqual(["asit", "tepkime"]);
  });
});

describe("nextSiblingOrder", () => {
  it("kök seviyesindeki kardeş sayısını döner", () => {
    expect(nextSiblingOrder(kimya(), null)).toBe(2);
  });

  it("bir ebeveynin altındaki kardeş sayısını döner", () => {
    expect(nextSiblingOrder(kimya(), "asit")).toBe(2);
  });

  it("çocuğu olmayan ebeveynde 0 döner", () => {
    expect(nextSiblingOrder(kimya(), "konu")).toBe(0);
  });
});

describe("treeKeyAction", () => {
  const flat = () => flattenGoalTree(buildGoalTree(kimya()), NONE);

  it("ArrowDown bir sonraki görünür satıra gider", () => {
    expect(treeKeyAction("ArrowDown", flat(), "asit", NONE)).toEqual({
      kind: "focus",
      id: "konu",
    });
  });

  it("son satırda ArrowDown yerinde kalır", () => {
    expect(treeKeyAction("ArrowDown", flat(), "tepkime", NONE)).toBeNull();
  });

  it("ArrowUp bir önceki görünür satıra gider", () => {
    expect(treeKeyAction("ArrowUp", flat(), "konu", NONE)).toEqual({
      kind: "focus",
      id: "asit",
    });
  });

  it("ilk satırda ArrowUp yerinde kalır", () => {
    expect(treeKeyAction("ArrowUp", flat(), "asit", NONE)).toBeNull();
  });

  it("ArrowRight KAPALI dalı açar", () => {
    const collapsed = new Set(["asit"]);
    const closed = flattenGoalTree(buildGoalTree(kimya()), collapsed);

    expect(treeKeyAction("ArrowRight", closed, "asit", collapsed)).toEqual({
      kind: "expand",
      id: "asit",
    });
  });

  it("ArrowRight AÇIK dalda ilk çocuğa gider", () => {
    expect(treeKeyAction("ArrowRight", flat(), "asit", NONE)).toEqual({
      kind: "focus",
      id: "konu",
    });
  });

  it("ArrowRight yaprakta hiçbir şey yapmaz", () => {
    expect(treeKeyAction("ArrowRight", flat(), "konu", NONE)).toBeNull();
  });

  it("ArrowLeft AÇIK dalı kapatır", () => {
    expect(treeKeyAction("ArrowLeft", flat(), "asit", NONE)).toEqual({
      kind: "collapse",
      id: "asit",
    });
  });

  it("ArrowLeft yaprakta EBEVEYNE gider", () => {
    expect(treeKeyAction("ArrowLeft", flat(), "konu", NONE)).toEqual({
      kind: "focus",
      id: "asit",
    });
  });

  it("ArrowLeft kök yaprakta hiçbir şey yapmaz", () => {
    expect(treeKeyAction("ArrowLeft", flat(), "tepkime", NONE)).toBeNull();
  });

  it("Home ilk satıra gider", () => {
    expect(treeKeyAction("Home", flat(), "bank", NONE)).toEqual({
      kind: "focus",
      id: "asit",
    });
  });

  it("End son GÖRÜNÜR satıra gider", () => {
    expect(treeKeyAction("End", flat(), "asit", NONE)).toEqual({
      kind: "focus",
      id: "tepkime",
    });
  });

  it("odak satırı listede değilse hiçbir şey yapmaz", () => {
    expect(treeKeyAction("ArrowDown", flat(), "yok", NONE)).toBeNull();
  });

  it("ilgisiz tuşta null döner", () => {
    expect(treeKeyAction("a", flat(), "asit", NONE)).toBeNull();
  });
});

describe("nodeEdit", () => {
  const node = goalNode({ id: "a", title: "Eski", note: "Eski not" });

  it("başlık ve notu BİRLİKTE yamalar", () => {
    // Regresyon: düzenleme formu ikisini de topluyor ama yalnızca
    // başlık yazılıyordu — kullanıcı not yazıp kaydediyor, form
    // kapanıyor, not sessizce kayboluyordu.
    expect(nodeEdit(node, { title: "Yeni", note: "Yeni not" })).toEqual({
      title: "Yeni",
      note: "Yeni not",
    });
  });

  it("boşaltılan notu null'a çevirir", () => {
    expect(nodeEdit(node, { title: "Yeni", note: null })).toEqual({
      title: "Yeni",
      note: null,
    });
  });

  it("başlığı normalleştirir", () => {
    expect(nodeEdit(node, { title: "  Yeni  ", note: null })?.title).toBe("Yeni");
  });

  it("boş başlıkta null döner — yazma YAPILMAZ", () => {
    expect(nodeEdit(node, { title: "   ", note: "not" })).toBeNull();
  });

  it("hiçbir şey değişmediyse null döner — boşa ağ turu atılmaz", () => {
    expect(nodeEdit(node, { title: "Eski", note: "Eski not" })).toBeNull();
  });

  it("yalnızca not değiştiyse yine de yazar", () => {
    expect(nodeEdit(node, { title: "Eski", note: "Başka" })).toEqual({
      title: "Eski",
      note: "Başka",
    });
  });
});
