import { addDays, eachDay, endOfIsoWeek, startOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { studyBucketMinutes } from "@/features/results/buckets";
import { sleepMinutes } from "@/features/results/format";
import type { DailyLog, TaskResult } from "@/features/results/types";
import type { Task } from "@/features/tasks/types";
import { topicKey } from "@/features/student/topics";

export interface CoachDay {
  date: DateStr;
  total: number;
  done: number;
  /** Planlanan süre: görevlerin tahmini toplamı (dk). */
  plannedMinutes: number;
  /** Gerçek süre: sonuçlardaki `actual_minutes` toplamı (dk). */
  actualMinutes: number;
  /** Günlük çalışma: gerçek süre yoksa formdaki kovanın orta noktası. */
  studyMinutes: number | null;
  sleepMinutes: number | null;
}

export function coachDay(
  date: DateStr,
  tasks: readonly Task[],
  results: readonly TaskResult[],
  logs: readonly DailyLog[],
): CoachDay {
  const dayTasks = tasks.filter((t) => t.dueDate === date);
  const actual = results
    .filter((r) => r.date === date)
    .reduce((sum, r) => sum + (r.actualMinutes ?? 0), 0);
  const log = logs.find((l) => l.date === date);
  const bucket = log?.studyBucket ?? null;

  return {
    date,
    total: dayTasks.length,
    done: dayTasks.filter((t) => t.done).length,
    plannedMinutes: dayTasks.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0),
    actualMinutes: actual,
    studyMinutes: actual > 0 ? actual : bucket !== null ? studyBucketMinutes(bucket) : null,
    sleepMinutes: log ? sleepMinutes(log) : null,
  };
}

export interface WeekSummary {
  days: CoachDay[];
  /** Haftanın bugüne kadarki toplam çalışması (dk). */
  totalStudyMinutes: number;
  /** Kayıtlı gecelerin ortalaması (dk); kayıt yoksa null. */
  avgSleepMinutes: number | null;
  /**
   * Plan–gerçek uyumu: bugüne kadar Σ gerçek / Σ plan, %100'de
   * sınırlı. Plan yoksa null.
   */
  adherence: number | null;
  plannedMinutes: number;
  actualMinutes: number;
}

export function weekSummary(
  today: DateStr,
  tasks: readonly Task[],
  results: readonly TaskResult[],
  logs: readonly DailyLog[],
): WeekSummary {
  const days = eachDay(startOfIsoWeek(today), endOfIsoWeek(today)).map((d) =>
    coachDay(d, tasks, results, logs),
  );
  const elapsed = days.filter((d) => d.date <= today);

  const sleeps = elapsed.map((d) => d.sleepMinutes).filter((m): m is number => m !== null);
  const planned = elapsed.reduce((s, d) => s + d.plannedMinutes, 0);
  const actual = elapsed.reduce((s, d) => s + d.actualMinutes, 0);

  return {
    days,
    totalStudyMinutes: elapsed.reduce((s, d) => s + (d.studyMinutes ?? 0), 0),
    avgSleepMinutes: sleeps.length ? Math.round(sleeps.reduce((a, b) => a + b, 0) / sleeps.length) : null,
    adherence: planned > 0 ? Math.min(1, actual / planned) : null,
    plannedMinutes: planned,
    actualMinutes: actual,
  };
}

export interface MissedItem {
  taskId: string;
  title: string;
  date: DateStr;
  status: "partial" | "skipped";
  reason: string | null;
}

export interface TopicCount {
  topic: string;
  count: number;
}

/** Son `days` günde "yarım/yapılmadı" sonuçlar ve en sık eksik konular. */
export function attention(
  today: DateStr,
  tasks: readonly Task[],
  results: readonly TaskResult[],
  days = 7,
  topN = 5,
): { missed: MissedItem[]; topics: TopicCount[] } {
  const from = addDays(today, -(days - 1));
  const titleById = new Map(tasks.map((t) => [t.id, t.title]));
  const recent = results.filter((r) => r.date >= from && r.date <= today);

  const missed: MissedItem[] = recent
    .filter((r): r is TaskResult & { status: "partial" | "skipped" } =>
      r.status === "partial" || r.status === "skipped",
    )
    .map((r) => ({
      taskId: r.taskId,
      title: titleById.get(r.taskId) ?? "Silinmiş görev",
      date: r.date,
      status: r.status,
      reason: r.reason,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const counts = new Map<string, TopicCount>();
  for (const r of recent) {
    for (const topic of r.missingTopics) {
      const key = topicKey(topic);
      const cur = counts.get(key) ?? { topic, count: 0 };
      cur.count++;
      counts.set(key, cur);
    }
  }
  const topics = [...counts.values()]
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, "tr"))
    .slice(0, topN);

  return { missed, topics };
}
