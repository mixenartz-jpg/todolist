import type { DateStr } from "@/lib/date/types";
import type { DistributionRow, Slice, Unit } from "./distribute";
import type { SectionProgress, SourceProgress } from "./progress";
import { planTasks, type TaskPlan } from "./title";
import type { Topic } from "./types";
import { isFree } from "./unitStatus";

/*
 * Dağıt'ın girdi tarafı: hangi kaynağın hangi birimleri dağıtılacak.
 *   Konu         konuyu içeren bölümler (bölüm konusu ya da test konusu)
 *   Kaynak+seri  serinin tüm bölümleri
 * Her iki durumda da yalnızca BOŞ (gri/kırmızı) birimler; isteğe bağlı
 * aralık süzgeci ("46-53").
 */

export interface SliceSpec {
  progress: SourceProgress;
  /** null → kalanın tamamı. */
  range: { from: number; to: number } | null;
}

function freeUnits(
  sections: readonly SectionProgress[],
  keep: (sec: SectionProgress, n: number) => boolean,
  range: { from: number; to: number } | null,
): Unit[] {
  const out: Unit[] = [];
  for (const sec of sections) {
    for (const st of sec.states) {
      if (!isFree(st)) continue;
      if (range && (st.number < range.from || st.number > range.to)) continue;
      if (!keep(sec, st.number)) continue;
      out.push({ sectionId: sec.section.id, number: st.number });
    }
  }
  return out;
}

/** Bu kaynakta konunun geçtiği bölümler var mı (Dağıt'ta listelenir). */
export function sourceHasTopic(p: SourceProgress, topicId: string): boolean {
  return p.series.some((s) =>
    s.sections.some((sec) => sec.section.topicId === topicId || sec.section.items.some((i) => i.topicId === topicId)),
  );
}

/** Konu dilimi: bölüm konusu eşleşen bölümün tüm testleri + konusu eşleşen tekil testler. */
export function topicSlice(spec: SliceSpec, topicId: string): Slice {
  const sections = spec.progress.series.flatMap((s) => s.sections);
  const units = freeUnits(
    sections,
    (sec, n) => {
      const item = sec.section.items.find((i) => i.number === n);
      const effective = item?.topicId ?? sec.section.topicId;
      return effective === topicId;
    },
    spec.range,
  );
  return { key: spec.progress.source.id, units };
}

/** Kaynak + seri dilimi. */
export function seriesSlice(spec: SliceSpec, seriesId: string): Slice {
  const series = spec.progress.series.find((s) => s.series.id === seriesId);
  return { key: spec.progress.source.id, units: freeUnits(series?.sections ?? [], () => true, spec.range) };
}

/** Dağıtım satırları → görev planları (seri/parça bölmesi `planTasks`'ta). */
export function plansFromRows(
  rows: readonly DistributionRow[],
  sources: ReadonlyMap<string, SourceProgress>,
  topics: ReadonlyMap<string, Topic>,
  actionFor: (p: SourceProgress) => string,
): TaskPlan[] {
  const plans: TaskPlan[] = [];
  for (const row of rows) {
    for (const [key, units] of row.cells) {
      if (units.length === 0) continue;
      const p = sources.get(key);
      if (!p) continue;
      const picks = new Map<string, Set<number>>();
      for (const u of units) picks.set(u.sectionId, (picks.get(u.sectionId) ?? new Set()).add(u.number));
      plans.push(...planTasks({ source: p.source, topics, picks, action: actionFor(p), dueDate: row.date as DateStr }));
    }
  }
  return plans;
}

/**
 * Düzenlenen hücre metnindeki numaraları birimlere çevir: önce dilimin
 * kendi birimlerinde aranır, yoksa numarayı kapsayan bölüm seçilir.
 */
export function unitsFromNumbers(numbers: readonly number[], slice: Slice, p: SourceProgress): Unit[] {
  const sections = p.series.flatMap((s) => s.sections);
  return numbers.flatMap((n) => {
    const own = slice.units.find((u) => u.number === n);
    if (own) return [own];
    const sec = sections.find((s) => n >= s.section.unitFrom && n <= s.section.unitTo);
    return sec ? [{ sectionId: sec.section.id, number: n }] : [];
  });
}
