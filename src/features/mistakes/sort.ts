import { compareDates } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { DersNode, KonuNode } from "./tree";

export type SortMode = "most" | "due" | "recent";

/** Sıralama seçicisinin gösterdiği sıra. İlk öğe varsayılandır. */
export const SORT_MODES: readonly { value: SortMode; label: string }[] = [
  { value: "most", label: "En çok yanlış" },
  { value: "due", label: "Tekrarı gelen" },
  { value: "recent", label: "En yeni" },
];

/**
 * Ağacı seçilen moda göre sıralar — hem ders hem konu seviyesinde.
 *
 * ── Neden `buildTree`'den ayrı? ──
 * Gruplama saf bir indirgemedir ve sıralama modundan bağımsızdır. Mod
 * değiştiğinde tüm ağacı yeniden kurmak yerine yalnızca yeniden
 * sıralarız; ayrıca ikisi ayrı ayrı test edilebilir kalır.
 *
 * ── Yanlışların kendi sırası hiçbir modda değişmez ──
 * Bir konunun içindeki sorular DAİMA yeniden eskiye sıralıdır. Mod,
 * "hangi dala önce bakayım" sorusuna cevap verir; dalın içindeki
 * kronoloji ise okuma sırasıdır ve karıştırılması kafa karıştırırdı.
 *
 * Dönüş her zaman yeni dizidir; girdi mutate edilmez.
 */
export function sortTree(tree: readonly DersNode[], mode: SortMode): DersNode[] {
  const compare = comparators[mode];

  return [...tree]
    .map((ders) => ({ ...ders, konular: [...ders.konular].sort(compare) }))
    .sort(compare);
}

/**
 * Her iki seviyede aynı karşılaştırıcı çalışır.
 *
 * `DersNode` ve `KonuNode` sıralama için gereken alanlarda (total,
 * dueCount, key ve en yeni tarih) örtüşür — tek bir karşılaştırıcı iki
 * seviyeye de yeter ve iki kopya mantığın ayrışma riski kalmaz.
 */
type SortableNode = Pick<DersNode, "key" | "total" | "dueCount"> &
  Partial<Pick<DersNode, "konular">> &
  Partial<Pick<KonuNode, "mistakes">>;

const comparators: Record<SortMode, (a: SortableNode, b: SortableNode) => number> = {
  most: (a, b) => b.total - a.total || byKey(a, b),
  due: (a, b) => b.dueCount - a.dueCount || b.total - a.total || byKey(a, b),
  recent: (a, b) => compareDates(newest(b), newest(a)) || byKey(a, b),
};

/**
 * Düğümdeki en yeni yanlışın tarihi.
 *
 * `buildTree` her konunun `mistakes` dizisini yeniden eskiye sıralı
 * bırakır; ilk eleman bu yüzden aramasız en yenidir. Ders düğümünde de
 * aynı şey konuları üzerinden geçerlidir.
 *
 * Boş düğüm oluşamaz (bir dal ancak içinde yanlış varsa var olur), ama
 * karşılaştırıcının total olması için taban tarih döner.
 */
const EPOCH = "0000-01-01" as DateStr;

function newest(node: SortableNode): DateStr {
  if (node.mistakes) return node.mistakes[0]?.date ?? EPOCH;

  let out = EPOCH;
  for (const konu of node.konular ?? []) {
    const date = konu.mistakes[0]?.date;
    if (date && compareDates(date, out) > 0) out = date;
  }
  return out;
}

function byKey(a: SortableNode, b: SortableNode): number {
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}
