import { addDays, eachDay, endOfIsoWeek, startOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { studyBucketMinutes } from "@/features/results/buckets";
import { resultSummary, sleepMinutes } from "@/features/results/format";
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

/** Panel "Bugün" kartında bir görevin durumu. */
export type BoardState = "done" | "partial" | "skipped" | "pending";

export interface BoardRow {
  task: Task;
  state: BoardState;
  /** "15D 2Y · 14.5 net · 2.2 sa"; sonuç yoksa boş. */
  summary: string;
}

/**
 * Bugünün görevleri tek tek: durum sonucun durumundan; sonuç yoksa
 * görevin `done`'ından (koç işaretlemiş olabilir), o da yoksa
 * "henüz girilmedi".
 */
export function todayBoard(
  today: DateStr,
  dayTasks: readonly Task[],
  results: readonly TaskResult[],
): BoardRow[] {
  return dayTasks.map((task) => {
    const r = results.find((x) => x.taskId === task.id && x.date === today);
    const state: BoardState = r?.status ?? (task.done ? "done" : "pending");
    return { task, state, summary: r ? resultSummary(r) : "" };
  });
}

export interface EarlyRow {
  task: Task;
  /** Planlanan gün. */
  plannedFor: DateStr;
  state: "done" | "partial";
}

/**
 * Bugün YAPILAN ama başka güne planlanmış görevler (`done_on` =
 * bugün, `date` ≠ bugün). Görev listede yoksa (silinmiş) atlanır.
 */
export function doneTodayElsewhere(
  today: DateStr,
  tasks: readonly Task[],
  doneToday: readonly TaskResult[],
): EarlyRow[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return doneToday
    .filter((r) => r.doneOn === today && r.date !== today)
    .filter((r) => r.status === "done" || r.status === "partial")
    .flatMap((r) => {
      const task = byId.get(r.taskId);
      return task ? [{ task, plannedFor: r.date, state: r.status as "done" | "partial" }] : [];
    })
    .sort((a, b) => (a.plannedFor < b.plannedFor ? -1 : 1));
}
