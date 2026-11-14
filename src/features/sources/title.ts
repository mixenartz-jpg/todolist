import type { DateStr } from "@/lib/date/types";
import { PROGRESS_ACTION } from "./actions";
import type { SectionNode, SeriesNode, SourceTree, Topic } from "./types";

/*
 * Katalog seçimi → oluşturulacak görevler. Saf; "Güne ekle", yan panel
 * ve Dağıt aynı üreticiyi kullanır. Başlık biçimi koçun kullandığı:
 *
 *   Kaynak | Konu | Miktar | Eylem
 *
 *   konu serisi  BilgiSarmal AYT Fizik SB | Basit Harmonik Hareket | 39 - 42. Testler | Çöz
 *   ÖSYM         BilgiSarmal AYT Fizik SB | ÖSYM Tipi 7 | Basit Harmonik Hareket | Çöz
 *   sarmal/sim.  BilgiSarmal AYT Fizik SB | Sarmal Test 6 | Çöz
 *   sayfa/soru   345 AYT Fizik | Basit Harmonik Hareket | 280-301 | Çöz
 *   İlerlet      BilgiSarmal | Problemler SB | İlerlet | ~10 sayfa
 *   video        X Akademi AYT Fizik Kursu | 12 - Basit Harmonik Hareket | İzle + Feynman
 *
 * Farklı serilerden seçim → her seri için ayrı görev. Test dışı birimde
 * her bölümün her ardışık parçası ayrı görev (görev tek aralık taşır).
 * Başlık sonradan elle düzenlenebilir; bağ id'lerde durduğu için kopmaz.
 */

export interface TaskPlan {
  title: string;
  dueDate: DateStr | null;
  sourceId: string;
  sectionId: string;
  rangeFrom: number | null;
  rangeTo: number | null;
  targetAmount: number | null;
  action: string;
  estimateMinutes: number | null;
  /** Test birimli kaynakta bağlanacak testler. */
  itemIds: string[];
  /** Birim sayısı (süre ve "son eklenen miktar" için). */
  units: number;
}

export interface PlanInput {
  source: SourceTree;
  topics: ReadonlyMap<string, Topic>;
  /** Bölüm → seçili birim numaraları. */
  picks: ReadonlyMap<string, ReadonlySet<number>>;
  action: string;
  dueDate: DateStr | null;
}

export interface ProgressInput {
  source: SourceTree;
  sectionId: string;
  /** Sıradaki boş birim. */
  start: number;
  /** Hedef miktar (~10 sayfa). */
  target: number;
  dueDate: DateStr | null;
}

/** [39,40,41,42] → "39 - 42"; [39,40,43] → "39 - 40, 43". */
export function formatNumbers(numbers: readonly number[], dash = " - "): string {
  return spans(numbers)
    .map((s) => (s.from === s.to ? String(s.from) : `${s.from}${dash}${s.to}`))
    .join(", ");
}

export function spans(numbers: Iterable<number>): Array<{ from: number; to: number }> {
  const out: Array<{ from: number; to: number }> = [];
  for (const n of [...new Set(numbers)].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && last.to + 1 === n) last.to = n;
    else out.push({ from: n, to: n });
  }
  return out;
}

function estimate(source: SourceTree, units: number): number | null {
  if (!source.minutesPerUnit) return null;
  return Math.max(1, Math.round(units * source.minutesPerUnit));
}

function distinct(list: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const x of list) if (x && !out.includes(x)) out.push(x);
  return out;
}

/** Bölümün başlıkta görünecek adı: aralıklı seri başlığında (etiket = seri adı) konu adı. */
function sectionName(sec: SectionNode, series: SeriesNode, topics: ReadonlyMap<string, Topic>): string | null {
  if (sec.label !== series.name) return sec.label;
  return sec.topicId ? (topics.get(sec.topicId)?.name ?? null) : null;
}

export function planTasks(input: PlanInput): TaskPlan[] {
  const { source, topics, picks, action, dueDate } = input;
  const plans: TaskPlan[] = [];

  for (const series of source.series) {
    const chosen = series.sections
      .map((sec) => ({ sec, numbers: [...(picks.get(sec.id) ?? [])].sort((a, b) => a - b) }))
      .filter((c) => c.numbers.length > 0);
    if (chosen.length === 0) continue;

    if (source.unit === "test") {
      const items = chosen.flatMap(({ sec, numbers }) => sec.items.filter((i) => numbers.includes(i.number)).map((i) => ({ i, sec })));
      if (items.length === 0) continue;
      const numbers = items.map((x) => x.i.number);
      const itemTopics = distinct(
        items.map(({ i, sec }) => {
          const tid = i.topicId ?? sec.topicId;
          return tid ? (topics.get(tid)?.name ?? null) : null;
        }),
      );
      const sectionNames = distinct(chosen.map(({ sec }) => sectionName(sec, series, topics)));

      let middle: string[];
      if (series.kind === "konu") {
        const count = numbers.length === 1 ? `${numbers[0]}. Test` : `${formatNumbers(numbers)}. Testler`;
        middle = [sectionNames.join(", ") || series.name, count];
      } else if (series.kind === "osym") {
        middle = [`${series.name} ${formatNumbers(numbers, "-")}`, ...(itemTopics.length ? [itemTopics.join(", ")] : [])];
      } else {
        middle = [`${series.name} ${formatNumbers(numbers, "-")}`];
      }

      plans.push({
        title: [source.title, ...middle, action].join(" | "),
        dueDate,
        sourceId: source.id,
        sectionId: chosen[0].sec.id,
        rangeFrom: null,
        rangeTo: null,
        targetAmount: null,
        action,
        estimateMinutes: estimate(source, items.length),
        itemIds: items.map((x) => x.i.id),
        units: items.length,
      });
      continue;
    }

    // Soru / sayfa / ders: bölüm başına, ardışık parça başına bir görev.
    for (const { sec, numbers } of chosen) {
      const name = sectionName(sec, series, topics) ?? series.name;
      for (const sp of spans(numbers)) {
        const units = sp.to - sp.from + 1;
        const amount = sp.from === sp.to ? String(sp.from) : `${sp.from}-${sp.to}`;
        const middle = source.unit === "ders" ? [`${amount} - ${name}`] : [name, amount];
        plans.push({
          title: [source.title, ...middle, action].join(" | "),
          dueDate,
          sourceId: source.id,
          sectionId: sec.id,
          rangeFrom: sp.from,
          rangeTo: sp.to,
          targetAmount: null,
          action,
          estimateMinutes: estimate(source, units),
          itemIds: [],
          units,
        });
      }
    }
  }
  return plans;
}

/**
 * İlerlet: yalnızca hedef miktar. Başlangıç = sıradaki boş birim;
 * `range_to` hedef kadar birimi REZERVE eder (bölüm sonunda kırpılır).
 */
export function planProgressTask(input: ProgressInput): TaskPlan | null {
  const { source, sectionId, start, target, dueDate } = input;
  for (const series of source.series) {
    const sec = series.sections.find((s) => s.id === sectionId);
    if (!sec) continue;
    if (target < 1 || start < sec.unitFrom || start > sec.unitTo) return null;
    const to = Math.min(sec.unitTo, start + target - 1);
    const name = sec.label !== series.name ? sec.label : series.name;
    return {
      title: [source.title, name, PROGRESS_ACTION, `~${target} ${source.unit}`].join(" | "),
      dueDate,
      sourceId: source.id,
      sectionId,
      rangeFrom: start,
      rangeTo: to,
      targetAmount: target,
      action: PROGRESS_ACTION,
      estimateMinutes: estimate(source, target),
      itemIds: [],
      units: target,
    };
  }
  return null;
}

/** Rutin görevi başlığı. */
export function routineTitle(name: string): string {
  return `Rutin | ${name.trim()}`;
}

/**
 * Koç görünümünde İlerlet satırı:
 * "Hedef ~10 sayfa → 8 sayfa ilerledi (126-133)".
 */
export function progressLine(
  task: { targetAmount?: number | null; rangeFrom?: number | null },
  result: { reachedTo?: number | null } | null | undefined,
  unit: string,
): string | null {
  if (task.targetAmount == null) return null;
  const head = `Hedef ~${task.targetAmount} ${unit}`;
  const reached = result?.reachedTo ?? null;
  if (reached === null || task.rangeFrom == null) return head;
  const done = Math.max(0, reached - task.rangeFrom + 1);
  return `${head} → ${done} ${unit} ilerledi (${task.rangeFrom}-${reached})`;
}
