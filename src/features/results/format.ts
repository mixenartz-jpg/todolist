import { hesaplaNet } from "@/features/deneme/net";
import type { DailyLog, TaskResult } from "./types";

/** D − Y/4. Doğru girilmemişse net yok. */
export function resultNet(r: Pick<TaskResult, "correct" | "wrong">): number | null {
  if (r.correct === null) return null;
  return hesaplaNet(r.correct, r.wrong ?? 0);
}

/** 22.25 → "22.25", 18.5 → "18.5", 20 → "20" */
export function formatNet(net: number): string {
  return String(Math.round(net * 100) / 100);
}

/** 150 → "2.5 sa", 45 → "45 dk", 90 → "1.5 sa" */
export function formatMinutesShort(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${String(hours).replace(/\.0$/, "")} sa`;
}

/**
 * Koç kartındaki tek satır: "23D 3Y 1B · 22.25 net · 2.5 sa".
 * Girilmemiş parçalar atlanır; hiçbir şey yoksa boş dize.
 */
export function resultSummary(r: TaskResult): string {
  const parts: string[] = [];

  const counts: string[] = [];
  if (r.correct !== null) counts.push(`${r.correct}D`);
  if (r.wrong !== null) counts.push(`${r.wrong}Y`);
  if (r.empty !== null && r.empty > 0) counts.push(`${r.empty}B`);
  if (counts.length > 0) parts.push(counts.join(" "));

  const net = resultNet(r);
  if (net !== null) parts.push(`${formatNet(net)} net`);

  if (r.actualMinutes !== null && r.actualMinutes > 0) {
    parts.push(formatMinutesShort(r.actualMinutes));
  }

  return parts.join(" · ");
}

/** Sonuçta görülecek bir şey var mı (boş satırı göstermemek için). */
export function hasResultContent(r: TaskResult): boolean {
  return (
    r.status !== null ||
    r.correct !== null ||
    r.wrong !== null ||
    r.actualMinutes !== null ||
    r.missingTopics.length > 0 ||
    Boolean(r.reason) ||
    Boolean(r.note)
  );
}

/**
 * Tamamlama yüzdesinin rengi: düşük kırmızı, orta sarı, yüksek yeşil.
 * Eşikler tek yerde; Bugün kartı ve Panel aynı dili konuşsun.
 */
export type CompletionTone = "low" | "mid" | "high";

export const COMPLETION_TONE_THRESHOLDS = { mid: 0.4, high: 0.7 } as const;

export function completionTone(ratio: number): CompletionTone {
  if (ratio >= COMPLETION_TONE_THRESHOLDS.high) return "high";
  if (ratio >= COMPLETION_TONE_THRESHOLDS.mid) return "mid";
  return "low";
}

export const TONE_COLOR: Record<CompletionTone, string> = {
  low: "var(--color-danger)",
  mid: "var(--color-warn)",
  high: "var(--color-good)",
};

/** "23:30" + "07:15" → 465 dk. Gece yarısını aşar. */
export function sleepMinutes(log: Pick<DailyLog, "sleepAt" | "wakeAt">): number | null {
  if (!log.sleepAt || !log.wakeAt) return null;
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = toMin(log.wakeAt) - toMin(log.sleepAt);
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

/** Günlük formun herhangi bir alanı dolu mu. */
export function isLogFilled(log: DailyLog | undefined): boolean {
  if (!log) return false;
  return (
    log.sleepAt !== null ||
    log.wakeAt !== null ||
    log.studyBucket !== null ||
    log.screenBucket !== null ||
    log.energy !== null ||
    Boolean(log.note?.trim())
  );
}
