import { planTasks } from "./title";
import type { TreeOps } from "./tree";
import type { SourceDraft, SourceTree, Topic } from "./types";

/*
 * Kaynak kaydedilince bağlı görevlerin başlığını tazele. Görev testlere
 * kimlikle bağlı (task_items), başlık ise oluşturulurken yazılmış düz
 * metin: numaralandırma değişince ("Üslü | 16-23" → 1'den) başlık eski
 * kalır. Saf; useSaveSource yazar.
 *
 * Yalnızca başlığı otomatik biçimde kalan görevler güncellenir: mevcut
 * başlık, eski ağaçtan üretilen başlıkla RAKAMLAR DIŞINDA aynıysa. Elle
 * değiştirilmiş başlığa dokunulmaz. Rakamları yok saymak, numarası
 * zaten değişmiş (önceden kaydedilmiş) kaynakları da yakalar.
 */

export interface LinkedTask {
  id: string;
  title: string;
  action: string | null;
  itemIds: string[];
}

/** Kaydedilen işlemlerden yeni ağaç (yalnızca başlık üretimi için). */
export function treeFromOps(
  id: string,
  draft: SourceDraft,
  ops: TreeOps,
  base: Pick<SourceTree, "status" | "studentId" | "aliases" | "sortOrder" | "archivedAt"> | null,
): SourceTree {
  return {
    id,
    title: draft.title,
    subject: draft.subject,
    exam: draft.exam,
    kind: draft.kind,
    publisher: draft.publisher,
    level: draft.level,
    unit: draft.unit,
    minutesPerUnit: draft.minutesPerUnit,
    status: base?.status ?? "sirada",
    totalTests: ops.totalUnits,
    studentId: base?.studentId ?? null,
    aliases: base?.aliases ?? [],
    sortOrder: base?.sortOrder ?? 0,
    archivedAt: base?.archivedAt ?? null,
    series: ops.series.map((s) => ({
      id: s.id,
      sourceId: id,
      name: s.name,
      kind: s.kind,
      sortOrder: s.sort_order,
      sections: ops.sections
        .filter((sec) => sec.series_id === s.id)
        .map((sec) => ({
          id: sec.id,
          seriesId: s.id,
          topicId: sec.topic_id,
          label: sec.label,
          unitFrom: sec.unit_from,
          unitTo: sec.unit_to,
          sortOrder: sec.sort_order,
          items: ops.items
            .filter((it) => it.section_id === sec.id)
            .map((it) => ({ id: it.id, sectionId: sec.id, number: it.number, topicId: it.topic_id }))
            .sort((a, b) => a.number - b.number),
        })),
    })),
  };
}

function titleFor(tree: SourceTree, topics: ReadonlyMap<string, Topic>, itemIds: readonly string[], action: string): string | null {
  const wanted = new Set(itemIds);
  const picks = new Map<string, Set<number>>();
  let found = 0;
  for (const s of tree.series)
    for (const sec of s.sections)
      for (const it of sec.items)
        if (wanted.has(it.id)) {
          picks.set(sec.id, (picks.get(sec.id) ?? new Set()).add(it.number));
          found++;
        }
  if (found !== wanted.size) return null; // bağlı test silinmiş
  const plans = planTasks({ source: tree, topics, picks, action, dueDate: null });
  return plans.length === 1 ? plans[0].title : null;
}

const shape = (t: string) => t.trim().replace(/\s+/g, " ").replace(/\d+/g, "#");

export function retitleTasks(
  before: SourceTree,
  after: SourceTree,
  topics: readonly Topic[],
  tasks: readonly LinkedTask[],
): Array<{ id: string; title: string }> {
  if (after.unit !== "test") return [];
  const byId = new Map(topics.map((t) => [t.id, t]));
  const out: Array<{ id: string; title: string }> = [];
  for (const task of tasks) {
    if (!task.action || task.itemIds.length === 0) continue;
    const old = titleFor(before, byId, task.itemIds, task.action);
    if (old === null || shape(old) !== shape(task.title)) continue;
    const next = titleFor(after, byId, task.itemIds, task.action);
    if (next !== null && next !== task.title) out.push({ id: task.id, title: next });
  }
  return out;
}
