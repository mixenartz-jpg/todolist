/**
 * Hedef ağacı — saf mantık, özelliğin test edilebilir çekirdeği.
 *
 * Bu modül yalnızca AĞACIN ŞEKLİNİ bilir: kim kimin çocuğu, hangi
 * taşıma geçerli, ekranda hangi sırayla çizilir. İlerleme hesabı
 * `nodeprogress.ts`'te, günlere dağıtım `distribute.ts`'te ayrı
 * yaşıyor — üçü tek dosyada olsaydı hiçbirini diğerini kurmadan test
 * edemezdik.
 *
 * ── Neden düzleştirme burada, JSX'te değil? ──
 * vitest yalnızca `src/**\/*.test.ts` çalıştırıyor; `.tsx` hiç test
 * edilmiyor. Ağaç yürüyüşü, aria sayaçları ve klavye gezintisi bir
 * bileşenin içinde yazılsaydı sessizce yanlış olabilirdi. Çizici
 * `flattenGoalTree`'nin verdiği düz listeyi dökmekten başka bir şey
 * yapmıyor.
 *
 * ── Neden `depth` hem satırda hem hesapta var? ──
 * Satırdaki `depth` SUNUCUNUN gerçeği (trigger yazıyor, 0022);
 * `FlatGoalNode.level` ise AĞAÇTAN türetilmiş olan. İkisi normalde
 * aynı, ama yetim satırlar atıldığı için düzleştirme kendi
 * gerçeğini kullanmalı: sunucudaki bir tutarsızlık ekranı kırmasın.
 */

import { normalizeNodeTitle } from "./goal";
import type { GoalNode } from "./types";
import type { SortOrderPatch } from "./reorder";

/**
 * Ağacın en derin seviyesi.
 *
 * Gerekçesi 0022'de: hedef → konu → alt konu → iş. Sınırsız derinlik
 * veritabanı için bedava ama arayüzde değil.
 */
export const GOAL_NODE_MAX_DEPTH = 3;

/** `plan_goals.title` 120'yken burası 200 — gerekçe 0022. */
export const GOAL_NODE_TITLE_MAX = 200;

export interface GoalTreeNode {
  node: GoalNode;
  children: GoalTreeNode[];
}

/** Düzleştirilmiş satır — çizici ve aria bunun üstünde çalışır. */
export interface FlatGoalNode {
  node: GoalNode;
  /** 1..3, AĞAÇTAN türetilmiş (bkz. dosya başlığı). `aria-level`. */
  level: number;
  hasChildren: boolean;
  /** Kardeşleri arasındaki sıfır tabanlı sırası. `aria-posinset` - 1. */
  index: number;
  /** Aynı ebeveyn altındaki kardeş sayısı. `aria-setsize`. */
  siblingCount: number;
}

/**
 * Düz satırları iç içe ağaca çevirir.
 *
 * ── Yetim satırlar ATILIR ──
 * Ebeveyni listede olmayan bir satır çizilmez. Normalde oluşamaz
 * (`on delete cascade`, 0022) ama iyimser bir silme ile sunucu cevabı
 * arasındaki anda önbellekte görülebilir. Onu köke terfi ettirmek,
 * kullanıcının kurmadığı bir yapıyı bir anlığına göstermek olurdu;
 * atmak sessiz ve doğru.
 *
 * Kardeşler `sortOrder`'a göre sıralanır. Sunucu sorgusu zaten bu
 * sırayla getiriyor (goal_nodes_user_goal_idx) ama iyimser
 * güncellemeler araya satır sokabiliyor.
 */
export function buildGoalTree(nodes: readonly GoalNode[]): GoalTreeNode[] {
  const byId = new Map<string, GoalTreeNode>();
  for (const node of nodes) byId.set(node.id, { node, children: [] });

  const roots: GoalTreeNode[] = [];

  for (const entry of byId.values()) {
    const parentId = entry.node.parentId;

    if (parentId === null) {
      roots.push(entry);
      continue;
    }

    const parent = byId.get(parentId);
    // Yetim: ebeveyni listede yok. Atılır, köke terfi ETTİRİLMEZ.
    if (parent === undefined) continue;

    parent.children.push(entry);
  }

  sortRecursive(roots);
  return roots;
}

function sortRecursive(level: GoalTreeNode[]): void {
  level.sort(bySortOrder);
  for (const entry of level) sortRecursive(entry.children);
}

function bySortOrder(a: GoalTreeNode, b: GoalTreeNode): number {
  if (a.node.sortOrder !== b.node.sortOrder) {
    return a.node.sortOrder - b.node.sortOrder;
  }
  // Eşitlikte kimliğe düş: sıra kararlı olmalı, yoksa her çizimde
  // satırlar yer değiştirebilir (sort_order varsayılanı 0 ve ilk
  // sıralamaya kadar tüm kardeşler eşit).
  return a.node.id < b.node.id ? -1 : a.node.id > b.node.id ? 1 : 0;
}

/**
 * Ağacı ekran sırasına düzler (derinlik öncelikli).
 *
 * `collapsed` içindeki düğümlerin ALTI atlanır — katlanmış dal hiç
 * çizilmez. Düğümün kendisi listede kalır, yalnızca çocukları düşer;
 * `aria-expanded="false"` o satırda yazılır.
 */
export function flattenGoalTree(
  tree: readonly GoalTreeNode[],
  collapsed: ReadonlySet<string>,
): FlatGoalNode[] {
  const out: FlatGoalNode[] = [];
  walk(tree, 1);
  return out;

  function walk(level: readonly GoalTreeNode[], depth: number): void {
    for (let i = 0; i < level.length; i++) {
      const entry = level[i];

      out.push({
        node: entry.node,
        level: depth,
        hasChildren: entry.children.length > 0,
        index: i,
        siblingCount: level.length,
      });

      if (collapsed.has(entry.node.id)) continue;
      walk(entry.children, depth + 1);
    }
  }
}

/**
 * Bir düğüm ve tüm altındakilerin kimlikleri.
 *
 * İki yerde gerekiyor: silme onayında torunları saymak ("bu başlık ve
 * altındaki 3 başlık silinir") ve iyimser silmede önbellekten tüm dalı
 * çıkarmak — sunucudaki `cascade` aynı işi yapıyor.
 *
 * Olmayan kimlikte boş dizi: çağıran "silinecek bir şey yok" diye okur.
 */
export function subtreeIds(nodes: readonly GoalNode[], id: string): string[] {
  if (!nodes.some((n) => n.id === id)) return [];

  const childrenOf = groupByParent(nodes);
  const out: string[] = [];
  const stack = [id];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    out.push(current);
    for (const child of childrenOf.get(current) ?? []) stack.push(child.id);
  }

  return out;
}

/**
 * Bir dalın kaç seviye derinliği var (kendisi dahil).
 *
 * Yaprak → 1. Taşıma kontrolünün ihtiyacı: bir dal, yüksekliğiyle
 * birlikte 3'ü aşmayacak bir yere taşınabilir. İki seviyelik bir dal
 * yalnızca 1. seviyenin altına sığar.
 */
export function subtreeHeight(nodes: readonly GoalNode[], id: string): number {
  const childrenOf = groupByParent(nodes);
  return heightOf(id);

  function heightOf(current: string): number {
    const children = childrenOf.get(current) ?? [];
    if (children.length === 0) return 1;

    let tallest = 0;
    for (const child of children) {
      const h = heightOf(child.id);
      if (h > tallest) tallest = h;
    }
    return tallest + 1;
  }
}

/**
 * Bir düğümün soy zinciri, KÖKTEN kendisine (kendisi dahil).
 *
 * Ekranda "Kimya › Asitler › Soru bankası" izini çizmek ve döngü
 * kontrolü için.
 */
export function ancestorChain(
  nodes: readonly GoalNode[],
  id: string,
): GoalNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const chain: GoalNode[] = [];

  let current = byId.get(id);
  // Döngüye karşı sayaç: bozuk veri sonsuz döngüye çevirmesin.
  let guard = nodes.length + 1;

  while (current !== undefined && guard-- > 0) {
    chain.push(current);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }

  return chain.reverse();
}

/** Taşımanın reddedilme sebebi. */
export type MoveRejection = "not-found" | "cycle" | "too-deep";

/**
 * Bu taşıma geçerli mi? null → geçerli.
 *
 * ── Neden sunucuya bırakılmıyor? ──
 * Veritabanı zaten reddederdi (check kısıtı + trigger, 0022). Ama
 * reddedilen bir ağ turu, devre dışı bir butondan çok daha kötü bir
 * deneyim: kullanıcı sürükler, bırakır, bir şey olur gibi görünür,
 * sonra hata çıkar. Arayüz geçersiz hedefi hiç sunmamalı.
 *
 * ── Çocuklu dal taşınabilir ──
 * Kullanıcının açık isteği. Sunucudaki `cascade_goal_node_depth`
 * trigger'ı torunların derinliğini yayıyor; burada tek yapmamız
 * gereken dalın YÜKSEKLİĞİNİ hesaba katmak, yoksa üç seviyelik bir
 * dalı 2. seviyeye taşıyıp torunları 4'e taşırdık.
 */
export function canMoveNode(
  nodes: readonly GoalNode[],
  id: string,
  nextParentId: string | null,
): MoveRejection | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (!byId.has(id)) return "not-found";

  if (nextParentId === null) {
    // Köke taşımak her zaman güvenli: derinlik yalnızca AZALIR.
    return null;
  }

  const parent = byId.get(nextParentId);
  if (parent === undefined) return "not-found";

  // Kendi soyunun altına (ya da kendi üstüne) taşımak döngü kurar.
  // `ancestorChain` hedefin kökten zincirini veriyor; taşınan düğüm o
  // zincirdeyse hedef onun torunudur.
  if (ancestorChain(nodes, nextParentId).some((n) => n.id === id)) {
    return "cycle";
  }

  // Dal, yüksekliğiyle birlikte sığmalı. Yaprak için yükseklik 1 ve
  // kontrol "ebeveyn derinliği + 1 <= 3"e iner.
  const level = ancestorChain(nodes, nextParentId).length;
  if (level + subtreeHeight(nodes, id) > GOAL_NODE_MAX_DEPTH) return "too-deep";

  return null;
}

/**
 * Kardeşler arası sıra değişikliği.
 *
 * `planReorder` (reorder.ts) ile AYNI sözleşme ve aynı gerekçeler:
 * yerinde takas, yalnızca DEĞİŞEN satırlar, sınırda ve olmayan
 * kimlikte boş dizi. `SortOrderPatch` de oradan geliyor — ikinci bir
 * tanım, iki yazma yolu demekti.
 *
 * `planReorder`'ı doğrudan çağırmıyoruz çünkü o `Task` tipli ve
 * `applySortOrders` sıralamayı `done`/`dueDate`'e göre kuruyor;
 * ikisi de bir plan düğümü için anlamsız.
 *
 * YALNIZCA aynı ebeveynin kardeşleri numaralanır: bir dalın içindeki
 * sıra değişikliği başka dalların satırlarını sunucuya göndermemeli.
 */
export function reorderSiblings(
  nodes: readonly GoalNode[],
  id: string,
  delta: -1 | 1,
): SortOrderPatch[] {
  const target = nodes.find((n) => n.id === id);
  if (target === undefined) return [];

  const siblings = nodes
    .filter((n) => n.parentId === target.parentId)
    .sort((a, b) =>
      a.sortOrder !== b.sortOrder
        ? a.sortOrder - b.sortOrder
        : a.id < b.id
          ? -1
          : a.id > b.id
            ? 1
            : 0,
    );

  const from = siblings.findIndex((n) => n.id === id);
  const to = from + delta;
  if (to < 0 || to >= siblings.length) return [];

  const next = [...siblings];
  [next[from], next[to]] = [next[to], next[from]];

  const patches: SortOrderPatch[] = [];
  for (let i = 0; i < next.length; i++) {
    if (next[i].sortOrder !== i) patches.push({ id: next[i].id, sortOrder: i });
  }

  return patches;
}

/**
 * Yeni bir çocuğun `sortOrder`'ı: o ebeveynin mevcut çocuk sayısı.
 *
 * `GoalNodeDraft.sortOrder`'a yazılır ve düğüm listenin SONUNA oturur —
 * `PlanGoalDraft.sortOrder`'ın "o aydaki mevcut hedef sayısı"
 * kuralıyla aynı.
 */
export function nextSiblingOrder(
  nodes: readonly GoalNode[],
  parentId: string | null,
): number {
  let count = 0;
  for (const node of nodes) if (node.parentId === parentId) count++;
  return count;
}

/** Ebeveyn kimliğinden çocuklarına — ağaç yürüyüşlerinin ortak tabanı. */
function groupByParent(
  nodes: readonly GoalNode[],
): Map<string, GoalNode[]> {
  const map = new Map<string, GoalNode[]>();

  for (const node of nodes) {
    if (node.parentId === null) continue;
    const list = map.get(node.parentId);
    if (list) list.push(node);
    else map.set(node.parentId, [node]);
  }

  return map;
}

/**
 * Klavyenin ağaçta ne yapması gerektiği.
 *
 * `null` → hiçbir şey; çağıran olayı ENGELLEMEZ (sayfa kaydırması,
 * tarayıcı kısayolları çalışmaya devam eder).
 */
export type TreeKeyAction =
  | { kind: "focus"; id: string }
  | { kind: "expand"; id: string }
  | { kind: "collapse"; id: string };

/**
 * WAI-ARIA ağaç klavye deseni — saf karar, DOM'a dokunmaz.
 *
 * Bileşenin içinde yazılsaydı test edilemezdi (`.tsx` hiç test
 * edilmiyor) ve ok tuşlarının "görünür satır" tanımı sessizce yanlış
 * olabilirdi: katlanmış bir dalın çocukları listede yokken ArrowDown
 * onlara atlamamalı. `flat` zaten yalnızca görünenleri içeriyor.
 *
 * Tip-ahead (harfe basınca o harfle başlayan düğüme atlama) BİLEREK
 * yok: desenin ölçek büyüdükçe kazandıran parçası ve buradaki ağaçlar
 * bir avuç düğüm tutuyor.
 */
export function treeKeyAction(
  key: string,
  flat: readonly FlatGoalNode[],
  focusedId: string,
  collapsed: ReadonlySet<string>,
): TreeKeyAction | null {
  const at = flat.findIndex((f) => f.node.id === focusedId);
  if (at === -1) return null;

  const current = flat[at];

  switch (key) {
    case "ArrowDown":
      return at + 1 < flat.length
        ? { kind: "focus", id: flat[at + 1].node.id }
        : null;

    case "ArrowUp":
      return at > 0 ? { kind: "focus", id: flat[at - 1].node.id } : null;

    case "ArrowRight": {
      if (!current.hasChildren) return null;
      // Kapalıysa aç; açıksa içine gir. İki adımlı bu davranış desenin
      // tam kendisi: sağ ok "derine in" demek, ve açmak da bir derine
      // inme biçimi.
      if (collapsed.has(current.node.id)) {
        return { kind: "expand", id: current.node.id };
      }
      return at + 1 < flat.length
        ? { kind: "focus", id: flat[at + 1].node.id }
        : null;
    }

    case "ArrowLeft": {
      if (current.hasChildren && !collapsed.has(current.node.id)) {
        return { kind: "collapse", id: current.node.id };
      }
      // Yaprak (ya da zaten kapalı): ebeveyne çık. Kökte ebeveyn yok.
      const parentId = current.node.parentId;
      return parentId === null ? null : { kind: "focus", id: parentId };
    }

    case "Home":
      return flat.length > 0 ? { kind: "focus", id: flat[0].node.id } : null;

    case "End":
      return flat.length > 0
        ? { kind: "focus", id: flat[flat.length - 1].node.id }
        : null;

    default:
      return null;
  }
}

/**
 * Düzenleme formunun sonucunu yazılabilir bir yamaya çevirir.
 *
 * `null` → YAZMA YAPILMAZ. İki sebepten olur: başlık boşaltılmış
 * (geçersiz) ya da hiçbir şey değişmemiş (boşa ağ turu).
 *
 * ── Neden başlık ve not BİRLİKTE? ──
 * Form ikisini de topluyor. Yalnızca başlığı yazan bir yol, kullanıcı
 * not yazıp "Kaydet"e bastığında formu kapatır ve notu sessizce
 * düşürürdü — bu depoda hiçbir yazma öyle davranmıyor. Tek yamada
 * yazmak ayrıca tek geri alma noktası demek: not kaydedilip başlık
 * başarısız olamaz.
 */
export function nodeEdit(
  node: GoalNode,
  values: { title: string; note: string | null },
): { title: string; note: string | null } | null {
  const title = normalizeNodeTitle(values.title);
  if (title === null) return null;

  if (title === node.title && values.note === node.note) return null;

  return { title, note: values.note };
}
