import type { Task } from "./types";

/** Gün sonu, dakika cinsinden. */
export const DAY_END_MINUTES = 24 * 60;

/** Süre seçiminde sunulan hazır değerler (dakika). */
export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

/**
 * 'HH:MM' ya da 'HH:MM:SS' → gün başından itibaren dakika.
 *
 * Geçersiz girdide `null` döner; sessizce 0 döndürmek geçersiz bir
 * saati gece yarısına çevirir ve planı sessizce bozardı.
 */
export function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** Dakika → 'HH:MM'. */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Bitiş dakikası.
 *
 * Gece yarısını aşan aralık gün sonunda kırpılır: bir gün planı
 * ertesi güne taşmamalı, taşarsa görev iki güne birden aitmiş gibi
 * görünürdü.
 */
export function endMinutes(start: number, duration: number | null): number {
  if (duration === null) return start;
  return Math.min(start + duration, DAY_END_MINUTES);
}

/**
 * Süreyi Türkçeleştirir.
 *
 * Tam saatlerde dakika kısmı YAZILMAZ: "2 sa 0 dk" makine çıktısı gibi
 * okunur.
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

export interface DaySchedule {
  /** Saati olanlar, saate göre artan. */
  timed: Task[];
  /** Saatsizler, mevcut sıralarını korur. */
  untimed: Task[];
}

/**
 * Günün görevlerini plan ve düz liste olarak ayırır.
 *
 * Saatli görevler saate göre sıralanır; eşitlikte `sortOrder`, sonra
 * `id` ile bozulur. Deterministik olması şart: aksi halde gün planı
 * her yeniden çizimde yer değiştirir.
 */
export function splitDaySchedule(tasks: readonly Task[]): DaySchedule {
  const timed: Task[] = [];
  const untimed: Task[] = [];

  for (const task of tasks) {
    if (task.startTime && parseTime(task.startTime) !== null) timed.push(task);
    else untimed.push(task);
  }

  timed.sort((a, b) => {
    const at = parseTime(a.startTime!)!;
    const bt = parseTime(b.startTime!)!;
    if (at !== bt) return at - bt;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return { timed, untimed };
}

/**
 * İki görevin zaman aralığı çakışıyor mu?
 *
 * Değen aralıklar çakışmaz: 09:00–10:00 ile 10:00–11:00 arka arkayadır,
 * çakışma değildir.
 */
export function overlaps(a: Task, b: Task): boolean {
  if (!a.startTime || !b.startTime) return false;

  const aStart = parseTime(a.startTime);
  const bStart = parseTime(b.startTime);
  if (aStart === null || bStart === null) return false;

  const aEnd = endMinutes(aStart, a.durationMinutes);
  const bEnd = endMinutes(bStart, b.durationMinutes);

  return aStart < bEnd && bStart < aEnd;
}
