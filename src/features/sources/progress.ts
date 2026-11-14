import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";
import type { Source } from "./types";

export interface SourceProgress {
  source: Source;
  /** Tamamlanan görevlerin aralıklarının BİRLEŞİMİ — tekrar sayılmaz. */
  covered: number;
  ratio: number;
  /** Bağlı görev sayısı (aralıklı + aralıksız). */
  taskCount: number;
  doneCount: number;
  /** Aralığı çıkarılamayan tamamlanmış görevler — yüzdeye girmez. */
  doneWithoutRange: number;
  last: { from: number; to: number; date: DateStr | null } | null;
}

/** [1..total] içine kırpılmış aralıkların birleşim uzunluğu. */
export function unionLength(ranges: ReadonlyArray<{ from: number; to: number }>, total: number): number {
  const clipped = ranges
    .map((r) => ({ from: Math.max(1, r.from), to: Math.min(total, r.to) }))
    .filter((r) => r.from <= r.to)
    .sort((a, b) => a.from - b.from);

  let covered = 0;
  let curFrom = -1;
  let curTo = -2;
  for (const r of clipped) {
    if (r.from > curTo + 1) {
      if (curTo >= curFrom && curFrom > 0) covered += curTo - curFrom + 1;
      curFrom = r.from;
      curTo = r.to;
    } else {
      curTo = Math.max(curTo, r.to);
    }
  }
  if (curFrom > 0) covered += curTo - curFrom + 1;
  return covered;
}

export function sourceProgress(sources: readonly Source[], tasks: readonly Task[]): SourceProgress[] {
  const bySource = new Map<string, Array<{ task: Task; range: { from: number; to: number } | null }>>();
  for (const task of tasks) {
    // Bağ yalnızca açıkça kurulur (kaynaktan oluşturulan görev);
    // başlıktan tahmin YOK.
    if (!task.sourceId) continue;
    const range =
      task.rangeFrom != null && task.rangeTo != null ? { from: task.rangeFrom, to: task.rangeTo } : null;
    const list = bySource.get(task.sourceId) ?? [];
    list.push({ task, range });
    bySource.set(task.sourceId, list);
  }

  return sources.map((source) => {
    const linked = bySource.get(source.id) ?? [];
    const done = linked.filter((l) => l.task.done);
    const ranges = done.flatMap((l) => (l.range ? [l.range] : []));
    const covered = unionLength(ranges, source.totalTests);

    const lastDone = [...done]
      .filter((l) => l.range)
      .sort((a, b) => {
        const ka = a.task.completedAt ?? a.task.dueDate ?? "";
        const kb = b.task.completedAt ?? b.task.dueDate ?? "";
        return ka < kb ? 1 : -1;
      })[0];

    return {
      source,
      covered,
      ratio: covered / source.totalTests,
      taskCount: linked.length,
      doneCount: done.length,
      doneWithoutRange: done.filter((l) => !l.range).length,
      last: lastDone?.range ? { ...lastDone.range, date: lastDone.task.dueDate } : null,
    };
  });
}
