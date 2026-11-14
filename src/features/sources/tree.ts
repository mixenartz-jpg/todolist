import { matchTopic, topicKey } from "@/features/topics/match";
import type { ParsedToc } from "./toc";
import type { Exam, SeriesKind, SeriesNode, SourceUnit, Topic } from "./types";

/*
 * İçindekiler metni kaydedilirken mevcut ağaçla EŞLEŞTİRİLİR: aynı
 * seri/bölüm/test kimliğini korur ki görev bağları (`tasks.section_id`,
 * `task_items`) kopmasın. Metin tek doğruluk kaynağıdır — sıra satır
 * sırasıdır, silinen satır silinir.
 *
 * Eşleştirme kuralları:
 *   seri    ad (Türkçe duyarsız)
 *   bölüm   aynı seride etiket; yoksa aynı aralık (etiket düzeltmesi)
 *   test    aynı seride aynı numara — bölüm sınırı kaysa da test aynı
 *           test kalır, yalnızca bölümü değişir.
 */

export interface DraftItemTopic {
  number: number;
  topicName: string;
  topicId: string | null;
}

export interface DraftSection {
  id: string;
  label: string;
  from: number;
  to: number;
  /** Aralıklı seri başlığından doğdu; konu aranmaz. */
  implicit: boolean;
  topicId: string | null;
  /** Mevcut bir bölümle eşleşti mi (önizlemede "yeni" rozeti için). */
  existing: boolean;
  line: number;
}

export interface DraftSeries {
  id: string;
  name: string;
  kind: SeriesKind;
  existing: boolean;
  line: number | null;
  sections: DraftSection[];
  itemTopics: DraftItemTopic[];
}

export interface DraftOptions {
  subject: string | null;
  exam: Exam | null;
  /** Önizlemede değiştirilen seri türleri (seri adı anahtarıyla). */
  kindOverrides?: Readonly<Record<string, SeriesKind>>;
  /** Önizlemede elle seçilen konular (`sectionKey` anahtarıyla); null = konusuz. */
  topicOverrides?: Readonly<Record<string, string | null>>;
  newId: () => string;
}

export function sectionKey(seriesName: string, label: string): string {
  return `${topicKey(seriesName)}|${topicKey(label)}`;
}

export function buildDraft(
  parsed: ParsedToc,
  existing: readonly SeriesNode[],
  topics: readonly Topic[],
  opts: DraftOptions,
): DraftSeries[] {
  const scope = { subject: opts.subject, exam: opts.exam };
  const usedSeries = new Set<string>();

  return parsed.series.map((ps) => {
    const old = existing.find((s) => !usedSeries.has(s.id) && topicKey(s.name) === topicKey(ps.name));
    if (old) usedSeries.add(old.id);
    const usedSections = new Set<string>();

    const sections = ps.sections.map((sec): DraftSection => {
      const oldSec =
        old?.sections.find((o) => !usedSections.has(o.id) && topicKey(o.label) === topicKey(sec.label)) ??
        old?.sections.find((o) => !usedSections.has(o.id) && o.unitFrom === sec.from && o.unitTo === sec.to);
      if (oldSec) usedSections.add(oldSec.id);

      const key = sectionKey(ps.name, sec.label);
      const override = opts.topicOverrides?.[key];
      const topicId = sec.implicit
        ? (override ?? null)
        : override !== undefined
          ? override
          : (oldSec?.topicId ?? matchTopic(sec.label, topics, scope)?.id ?? null);

      return {
        id: oldSec?.id ?? opts.newId(),
        label: sec.label,
        from: sec.from,
        to: sec.to,
        implicit: sec.implicit,
        topicId,
        existing: Boolean(oldSec),
        line: sec.line,
      };
    });

    return {
      id: old?.id ?? opts.newId(),
      name: ps.name,
      kind: opts.kindOverrides?.[topicKey(ps.name)] ?? (old && ps.line !== null ? old.kind : ps.kind),
      existing: Boolean(old),
      line: ps.line,
      sections,
      itemTopics: ps.itemTopics.map((t) => ({
        number: t.number,
        topicName: t.topic,
        topicId: matchTopic(t.topic, topics, scope)?.id ?? null,
      })),
    };
  });
}

// ───────────────────────────── Fark ─────────────────────────────────

export interface SeriesUpsert {
  id: string;
  source_id: string;
  name: string;
  kind: SeriesKind;
  sort_order: number;
}
export interface SectionUpsert {
  id: string;
  series_id: string;
  topic_id: string | null;
  label: string;
  unit_from: number;
  unit_to: number;
  sort_order: number;
}
export interface ItemUpsert {
  id: string;
  section_id: string;
  number: number;
  topic_id: string | null;
}

export interface TreeOps {
  series: SeriesUpsert[];
  sections: SectionUpsert[];
  items: ItemUpsert[];
  deleteItems: string[];
  deleteSections: string[];
  deleteSeries: string[];
  /** Kaynağın toplam birim sayısı (0029'dan kalan `total_tests`). */
  totalUnits: number;
}

/**
 * Taslak ağaç → veritabanı işlemleri. Değişmeyen satır da upsert
 * edilir (sıra numarası güncel kalsın); veri küçük.
 */
export function diffTree(
  sourceId: string,
  unit: SourceUnit,
  draft: readonly DraftSeries[],
  existing: readonly SeriesNode[],
  newId: () => string,
): TreeOps {
  const ops: TreeOps = {
    series: [],
    sections: [],
    items: [],
    deleteItems: [],
    deleteSections: [],
    deleteSeries: [],
    totalUnits: 0,
  };

  const keepSeries = new Set<string>();
  const keepSections = new Set<string>();
  const keepItems = new Set<string>();

  draft.forEach((s, si) => {
    keepSeries.add(s.id);
    ops.series.push({ id: s.id, source_id: sourceId, name: s.name, kind: s.kind, sort_order: si });

    // Bu serinin mevcut testleri: numara → item (bölümden bağımsız).
    const old = existing.find((e) => e.id === s.id);
    const oldItems = new Map<number, string>();
    for (const sec of old?.sections ?? []) for (const it of sec.items) oldItems.set(it.number, it.id);
    const itemTopic = new Map(s.itemTopics.map((t) => [t.number, t.topicId]));

    s.sections.forEach((sec, ci) => {
      keepSections.add(sec.id);
      ops.totalUnits += sec.to - sec.from + 1;
      ops.sections.push({
        id: sec.id,
        series_id: s.id,
        topic_id: sec.topicId,
        label: sec.label,
        unit_from: sec.from,
        unit_to: sec.to,
        sort_order: ci,
      });
      if (unit !== "test") return;
      for (let n = sec.from; n <= sec.to; n++) {
        const id = oldItems.get(n) ?? newId();
        keepItems.add(id);
        ops.items.push({ id, section_id: sec.id, number: n, topic_id: itemTopic.get(n) ?? null });
      }
    });
  });

  for (const s of existing) {
    if (!keepSeries.has(s.id)) ops.deleteSeries.push(s.id);
    for (const sec of s.sections) {
      if (!keepSections.has(sec.id)) ops.deleteSections.push(sec.id);
      for (const it of sec.items) if (!keepItems.has(it.id)) ops.deleteItems.push(it.id);
    }
  }
  return ops;
}

/** Mevcut ağacın içindekiler metni için girdi (`tocText`). */
export function treeAsToc(
  tree: readonly SeriesNode[],
  topics: readonly Topic[],
): Array<{
  name: string;
  sections: Array<{ label: string; from: number; to: number }>;
  itemTopics: Array<{ number: number; topic: string }>;
}> {
  const nameOf = new Map(topics.map((t) => [t.id, t.name]));
  return tree.map((s) => ({
    name: s.name,
    sections: s.sections.map((sec) => ({ label: sec.label, from: sec.unitFrom, to: sec.unitTo })),
    itemTopics: s.sections.flatMap((sec) =>
      sec.items.flatMap((it) => {
        const name = it.topicId ? nameOf.get(it.topicId) : undefined;
        return name ? [{ number: it.number, topic: name }] : [];
      }),
    ),
  }));
}
