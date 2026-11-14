import type { TaskResult } from "@/features/results/types";
import type { Task } from "@/features/tasks/types";
import type { SectionNode, SeriesNode, SourceTree } from "./types";
import {
  addSummaries,
  sectionUnitStates,
  summarize,
  type LinkedTask,
  type MarkStatus,
  type UnitMark,
  type UnitState,
  type UnitSummary,
} from "./unitStatus";

/*
 * Kaynak ağacı + görevler + sonuçlar + elle işaretler → her bölümün
 * kutucuk durumları ve özetleri. Saf; katalog, yan panel, Dağıt ve
 * konu takibi aynı hesabı kullanır.
 */

export interface ItemMark {
  itemId: string;
  status: MarkStatus;
  markedAt: string;
  note: string | null;
}

export interface RangeMark {
  sectionId: string;
  from: number;
  to: number;
  status: MarkStatus;
  markedAt: string;
  note: string | null;
}

export interface ProgressContext {
  tasks: readonly Task[];
  /** Görev ↔ test bağları. */
  taskItems: ReadonlyArray<{ taskId: string; itemId: string }>;
  results: readonly TaskResult[];
  itemMarks?: readonly ItemMark[];
  rangeMarks?: readonly RangeMark[];
}

export interface SectionProgress {
  section: SectionNode;
  states: UnitState[];
  summary: UnitSummary;
  /** Bu bölüme bağlı görevler (yeniden eskiye). */
  tasks: Task[];
}

export interface SeriesProgress {
  series: SeriesNode;
  sections: SectionProgress[];
  summary: UnitSummary;
}

export interface SourceProgress {
  source: SourceTree;
  series: SeriesProgress[];
  summary: UnitSummary;
  /** Kaynağa bağlı görev var mı (otomatik "devam" için). */
  hasLinks: boolean;
}

/** Görevin ana sonucu: kendi günündeki, yoksa en yenisi. */
export function mainResult(task: Task, results: readonly TaskResult[]): TaskResult | null {
  const own = results.filter((r) => r.taskId === task.id);
  if (own.length === 0) return null;
  return own.find((r) => r.date === task.dueDate) ?? [...own].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

/** Hesap için önceden indekslenmiş bağlam (kaynak başına tekrar etmesin). */
export interface ProgressIndex {
  tasksById: Map<string, Task>;
  resultByTask: Map<string, TaskResult | null>;
  itemsByTask: Map<string, Set<string>>;
  tasksByItem: Map<string, string[]>;
  tasksBySection: Map<string, Task[]>;
  itemMarks: Map<string, ItemMark>;
  rangeMarks: Map<string, RangeMark[]>;
}

export function indexProgress(ctx: ProgressContext): ProgressIndex {
  const tasksById = new Map(ctx.tasks.map((t) => [t.id, t]));
  const resultsByTask = new Map<string, TaskResult[]>();
  for (const r of ctx.results) {
    const list = resultsByTask.get(r.taskId) ?? [];
    list.push(r);
    resultsByTask.set(r.taskId, list);
  }
  const resultByTask = new Map<string, TaskResult | null>();
  for (const t of ctx.tasks) resultByTask.set(t.id, mainResult(t, resultsByTask.get(t.id) ?? []));

  const itemsByTask = new Map<string, Set<string>>();
  const tasksByItem = new Map<string, string[]>();
  for (const { taskId, itemId } of ctx.taskItems) {
    if (!tasksById.has(taskId)) continue;
    const set = itemsByTask.get(taskId) ?? new Set<string>();
    set.add(itemId);
    itemsByTask.set(taskId, set);
    const list = tasksByItem.get(itemId) ?? [];
    list.push(taskId);
    tasksByItem.set(itemId, list);
  }

  const tasksBySection = new Map<string, Task[]>();
  for (const t of ctx.tasks) {
    if (!t.sectionId) continue;
    const list = tasksBySection.get(t.sectionId) ?? [];
    list.push(t);
    tasksBySection.set(t.sectionId, list);
  }

  const rangeMarks = new Map<string, RangeMark[]>();
  for (const m of ctx.rangeMarks ?? []) {
    const list = rangeMarks.get(m.sectionId) ?? [];
    list.push(m);
    rangeMarks.set(m.sectionId, list);
  }

  return {
    tasksById,
    resultByTask,
    itemsByTask,
    tasksByItem,
    tasksBySection,
    itemMarks: new Map((ctx.itemMarks ?? []).map((m) => [m.itemId, m])),
    rangeMarks,
  };
}

function sectionProgress(section: SectionNode, unit: SourceTree["unit"], ix: ProgressIndex): SectionProgress {
  const links: LinkedTask[] = [];
  const marks: UnitMark[] = [];
  const linked = new Map<string, Task>();

  if (unit === "test") {
    const numberOf = new Map(section.items.map((i) => [i.id, i.number]));
    const unitsByTask = new Map<string, number[]>();
    for (const item of section.items) {
      for (const taskId of ix.tasksByItem.get(item.id) ?? []) {
        const list = unitsByTask.get(taskId) ?? [];
        list.push(item.number);
        unitsByTask.set(taskId, list);
      }
      const m = ix.itemMarks.get(item.id);
      if (m) marks.push({ from: item.number, to: item.number, status: m.status, markedAt: m.markedAt, note: m.note });
    }
    for (const [taskId, units] of unitsByTask) {
      const task = ix.tasksById.get(taskId)!;
      linked.set(taskId, task);
      const result = ix.resultByTask.get(taskId) ?? null;
      const doneUnits = new Set(
        (result?.doneItems ?? []).flatMap((id) => (numberOf.has(id) ? [numberOf.get(id)!] : [])),
      );
      links.push({ task, units, result, doneUnits });
    }
  } else {
    for (const task of ix.tasksBySection.get(section.id) ?? []) {
      if (task.rangeFrom == null || task.rangeTo == null) continue;
      linked.set(task.id, task);
      const units: number[] = [];
      for (let n = Math.max(task.rangeFrom, section.unitFrom); n <= Math.min(task.rangeTo, section.unitTo); n++) {
        units.push(n);
      }
      links.push({ task, units, result: ix.resultByTask.get(task.id) ?? null });
    }
    for (const m of ix.rangeMarks.get(section.id) ?? []) {
      marks.push({ from: m.from, to: m.to, status: m.status, markedAt: m.markedAt, note: m.note });
    }
  }

  const states = sectionUnitStates({ from: section.unitFrom, to: section.unitTo, links, marks });
  return {
    section,
    states,
    summary: summarize(states),
    tasks: [...linked.values()].sort((a, b) => ((a.dueDate ?? "") < (b.dueDate ?? "") ? 1 : -1)),
  };
}

export function sourceProgress(source: SourceTree, ix: ProgressIndex): SourceProgress {
  const series = source.series.map((s): SeriesProgress => {
    const sections = s.sections.map((sec) => sectionProgress(sec, source.unit, ix));
    return { series: s, sections, summary: addSummaries(sections.map((x) => x.summary)) };
  });
  return {
    source,
    series,
    summary: addSummaries(series.map((s) => s.summary)),
    hasLinks: series.some((s) => s.sections.some((x) => x.tasks.length > 0)),
  };
}
