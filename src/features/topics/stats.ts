import { TOPIC_THRESHOLDS } from "@/features/alerts/thresholds";
import type { TaskResult } from "@/features/results/types";
import { mainResult, type ProgressIndex, type SourceProgress } from "@/features/sources/progress";
import type { SourceKind, Topic } from "@/features/sources/types";
import type { DateStr } from "@/lib/date/types";
import { topicKey } from "./match";

/*
 * Konu takibi: tüm kaynaklardan bir konunun durumu. Saf.
 *
 *   çözülen      konuya ait YEŞİL birimler (kitap; video ayrı sayılır)
 *   doğruluk     konuya bağlı görevlerin sonuçlarında D / (D + Y)
 *   kaynaklar    hangi kaynaktan ne kadar
 *   video        izlenen / toplam ders
 *   son çalışma  en yeni sonuç ya da elle işaret günü
 *
 * Birimin konusu: test kutucuğunun kendi konusu, yoksa bölümün.
 */

export type TopicStatus = "none" | "working" | "good" | "weak";

export interface TopicSourceShare {
  sourceId: string;
  title: string;
  kind: SourceKind;
  unit: string;
  green: number;
  total: number;
}

export interface TopicStats {
  topic: Topic;
  solved: number;
  /** Kitap birimleri toplamı (kaynaklarda konuya ayrılan). */
  total: number;
  correct: number;
  wrong: number;
  /** D/(D+Y); D/Y girilmemişse null. */
  accuracy: number | null;
  /** Son `recentCount` D/Y'li sonucun doğruluğu. */
  recentAccuracy: number | null;
  sources: TopicSourceShare[];
  video: { watched: number; total: number } | null;
  lastDate: DateStr | null;
  status: TopicStatus;
  taskCount: number;
}

interface Acc {
  solved: number;
  total: number;
  shares: Map<string, TopicSourceShare>;
  video: { watched: number; total: number };
  tasks: Set<string>;
  lastMark: DateStr | null;
}

export function topicStats(
  topics: readonly Topic[],
  sources: readonly SourceProgress[],
  ix: ProgressIndex,
  results: readonly TaskResult[],
  scope: { subject: string | null; exam: string | null },
): TopicStats[] {
  const scoped = topics.filter(
    (t) =>
      (!scope.subject || topicKey(t.subject) === topicKey(scope.subject)) && (!scope.exam || t.exam === scope.exam),
  );
  const acc = new Map<string, Acc>(
    scoped.map((t) => [
      t.id,
      { solved: 0, total: 0, shares: new Map(), video: { watched: 0, total: 0 }, tasks: new Set(), lastMark: null },
    ]),
  );

  for (const p of sources) {
    const src = p.source;
    for (const series of p.series) {
      for (const sec of series.sections) {
        const itemByNumber = new Map(sec.section.items.map((i) => [i.number, i]));
        for (const st of sec.states) {
          const item = itemByNumber.get(st.number);
          const topicId = item?.topicId ?? sec.section.topicId;
          if (!topicId) continue;
          const a = acc.get(topicId);
          if (!a) continue;
          const green = st.color === "green" ? 1 : 0;
          if (src.kind === "video") {
            a.video.total++;
            a.video.watched += green;
          } else {
            a.total++;
            a.solved += green;
          }
          const share = a.shares.get(src.id) ?? {
            sourceId: src.id,
            title: src.title,
            kind: src.kind,
            unit: src.unit,
            green: 0,
            total: 0,
          };
          share.total++;
          share.green += green;
          a.shares.set(src.id, share);
          if (st.manual && st.date && (!a.lastMark || st.date > a.lastMark)) a.lastMark = st.date;
          if (item) for (const taskId of ix.tasksByItem.get(item.id) ?? []) a.tasks.add(taskId);
        }
        // Aralık birimli bölümler: bağlı görevler bölümün konusuna.
        if (src.unit !== "test" && sec.section.topicId) {
          const a = acc.get(sec.section.topicId);
          if (a) for (const t of sec.tasks) a.tasks.add(t.id);
        }
      }
    }
  }

  return scoped.map((topic) => {
    const a = acc.get(topic.id)!;
    const res = [...a.tasks]
      .map((id) => {
        const task = ix.tasksById.get(id);
        return task ? mainResult(task, results) : null;
      })
      .filter((r): r is TaskResult => r !== null);

    const withDY = res
      .filter((r) => (r.correct ?? 0) + (r.wrong ?? 0) > 0)
      .sort((x, y) => ((x.doneOn ?? x.date) < (y.doneOn ?? y.date) ? 1 : -1));
    const sum = (list: TaskResult[]) =>
      list.reduce((s, r) => ({ c: s.c + (r.correct ?? 0), w: s.w + (r.wrong ?? 0) }), { c: 0, w: 0 });
    const all = sum(withDY);
    const recent = sum(withDY.slice(0, TOPIC_THRESHOLDS.recentCount));
    const accuracy = all.c + all.w > 0 ? all.c / (all.c + all.w) : null;
    const recentAccuracy = recent.c + recent.w > 0 ? recent.c / (recent.c + recent.w) : null;

    const lastResult = res
      .filter((r) => r.status !== null)
      .map((r) => r.doneOn ?? r.date)
      .sort()
      .at(-1);
    const lastDate = [lastResult ?? null, a.lastMark].filter((x): x is DateStr => x !== null).sort().at(-1) ?? null;

    const active = a.solved > 0 || a.video.watched > 0 || a.tasks.size > 0;
    const status: TopicStatus = !active
      ? "none"
      : recentAccuracy === null
        ? "working"
        : recentAccuracy >= TOPIC_THRESHOLDS.good
          ? "good"
          : recentAccuracy < TOPIC_THRESHOLDS.weak
            ? "weak"
            : "working";

    return {
      topic,
      solved: a.solved,
      total: a.total,
      correct: all.c,
      wrong: all.w,
      accuracy,
      recentAccuracy,
      sources: [...a.shares.values()].sort((x, y) => y.green - x.green || x.title.localeCompare(y.title, "tr")),
      video: a.video.total > 0 ? a.video : null,
      lastDate,
      status,
      taskCount: a.tasks.size,
    };
  });
}
