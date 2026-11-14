import { addDays } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatMinutesShort, isLogFilled, sleepMinutes } from "@/features/results/format";
import type { DailyLog, TaskResult } from "@/features/results/types";
import type { Task } from "@/features/tasks/types";
import { topicKey } from "@/features/student/topics";
import { ALERT_THRESHOLDS, type AlertThresholds } from "./thresholds";

export type AlertKind = "form-missing" | "low-completion" | "low-sleep" | "repeat-skip";

export interface Alert {
  kind: AlertKind;
  text: string;
}

interface AlertInput {
  today: DateStr;
  tasks: readonly Task[];
  results: readonly TaskResult[];
  logs: readonly DailyLog[];
  /** Öğrenci ne zamandan beri var — öncesi "form doldurmadı" sayılmaz. */
  since?: DateStr;
}

/**
 * Panel'in üstündeki uyarılar. YALNIZCA tetiklenenler döner.
 * Bugün hesaba katılmaz (gün bitmedi); bakış dünden geriye.
 */
export function computeAlerts(input: AlertInput, t: AlertThresholds = ALERT_THRESHOLDS): Alert[] {
  const { today, tasks, results, logs, since } = input;
  const out: Alert[] = [];
  const yesterday = addDays(today, -1);
  const logByDate = new Map(logs.map((l) => [l.date, l]));

  // 1. Günlük form üst üste boş.
  let missing = 0;
  for (let d = yesterday; ; d = addDays(d, -1)) {
    if (since && d < since) break;
    if (isLogFilled(logByDate.get(d))) break;
    missing++;
    if (missing >= 60) break;
  }
  if (missing >= t.formMissingDays) {
    out.push({ kind: "form-missing", text: `Günlük form ${missing} gündür doldurulmadı` });
  }

  // 2. Tamamlanma ardışık günlerde düşük (görevi olan günler).
  const lowDays: number[] = [];
  for (let d = yesterday, scanned = 0; scanned < 30 && lowDays.length < t.lowCompletion.days; d = addDays(d, -1), scanned++) {
    const dayTasks = tasks.filter((x) => x.dueDate === d);
    if (dayTasks.length === 0) continue;
    const ratio = dayTasks.filter((x) => x.done).length / dayTasks.length;
    if (ratio >= t.lowCompletion.ratio) break;
    lowDays.push(ratio);
  }
  if (lowDays.length >= t.lowCompletion.days) {
    out.push({
      kind: "low-completion",
      text: `Tamamlanma ${t.lowCompletion.days} gün üst üste %${Math.round(t.lowCompletion.ratio * 100)}'in altında`,
    });
  }

  // 3. Son N kayıtlı gecenin ortalama uykusu.
  const sleeps = logs
    .filter((l) => l.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(sleepMinutes)
    .filter((m): m is number => m !== null)
    .slice(0, t.sleepWindowDays);
  if (sleeps.length >= t.sleepWindowDays) {
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
    if (avg < t.minSleepHours * 60) {
      out.push({ kind: "low-sleep", text: `Son ${t.sleepWindowDays} gece ortalama uyku ${formatMinutesShort(Math.round(avg))}` });
    }
  }

  // 4. Aynı görev tekrar tekrar "yapılmadı".
  const from = addDays(today, -t.repeatSkipWindowDays);
  const titleById = new Map(tasks.map((x) => [x.id, x.title]));
  const counts = new Map<string, { title: string; n: number }>();
  for (const r of results) {
    if (r.status !== "skipped" || r.date < from) continue;
    const title = titleById.get(r.taskId);
    // Önce görev kimliği (taşınan görev), başlık biliniyorsa başlık:
    // koç aynı işi her gün yeniden yazıyorsa da yakalansın.
    const key = title ? `t:${topicKey(title)}` : `id:${r.taskId}`;
    const cur = counts.get(key) ?? { title: title ?? "Bir görev", n: 0 };
    cur.n++;
    counts.set(key, cur);
  }
  const repeated = [...counts.values()].filter((c) => c.n >= t.repeatSkip).sort((a, b) => b.n - a.n);
  for (const c of repeated.slice(0, 2)) {
    out.push({ kind: "repeat-skip", text: `"${c.title}" ${c.n} kez yapılmadı` });
  }

  return out;
}
