/**
 * Sürükleme sonucunu tek bir mutasyon niyetine indirger.
 *
 * Sürükleme motoru (`useDragBlock`) yalnızca piksel toplar; hangi
 * mutasyonun atılacağına burası karar verir. Ayrım kasıtlı: karar saf
 * bir fonksiyonda olduğu için test edilebilir, hook ise React'e ve
 * DOM'a bağlı olduğu için edilemez.
 */

import type { DateStr } from "@/lib/date/types";
import { formatTime } from "@/features/tasks/schedule";
import type { Task } from "@/features/tasks/types";

/** Optimistic olarak eklenmiş, henüz sunucuda karşılığı olmayan görev. */
const PENDING_PREFIX = "tmp-";

/**
 * Bu görev henüz yazılmadı mı?
 *
 * Optimistic `useCreateTask` önbelleğe geçici kimlikli bir satır koyar.
 * O satıra yapılacak her yazma var olmayan bir id'ye gider ve sessizce
 * kaybolur — bu yüzden geçici görevler sürüklenemez, silinemez,
 * işaretlenemez. Tek yardımcı, üç yerden okunur (mutations, TaskBlock,
 * resolveDrop).
 */
export function isPendingTask(id: string): boolean {
  return id.startsWith(PENDING_PREFIX);
}

/** Optimistic satır için geçici kimlik üretir. */
export function pendingTaskId(): string {
  return `${PENDING_PREFIX}${crypto.randomUUID()}`;
}

export interface DragResult {
  task: Task;
  /** Bloğun bırakıldığı gün. Gün ölçeğinde daima aynı gün. */
  targetDate: DateStr;
  /** Snap'lenmiş başlangıç dakikası. null → saatsiz şeride bırakıldı. */
  targetStart: number | null;
  /** Boyutlandırmadan gelen yeni süre. Taşımada değişmeden gelir. */
  targetDuration: number | null;
}

export type DropIntent =
  /** Hiçbir şey değişmedi — yazma yapılmaz. */
  | { kind: "none" }
  /** Aynı gün, yeni saat ya da yeni süre. */
  | { kind: "time"; id: string; startTime: string; durationMinutes: number | null }
  /** Başka gün + saat, tek atomik yazma. */
  | {
      kind: "move";
      id: string;
      dueDate: DateStr;
      startTime: string;
      durationMinutes: number | null;
    }
  /** Izgaradan saatsiz şeride: saat ve süre temizlenir. */
  | { kind: "unschedule"; id: string }
  /** Saatsiz şeritten ızgaraya: ilk kez saat verilir. */
  | {
      kind: "schedule";
      id: string;
      dueDate: DateStr;
      startTime: string;
      durationMinutes: number;
    };

/**
 * Bırakma sonucunu niyete çevirir.
 *
 * `"none"` dalı gereksiz değil, ASIL koruma: sürükleme eşiğini geçmiş
 * ama aynı yuvaya geri bırakılmış bir hareket, hiçbir şey değişmemesine
 * rağmen bir yazma + optimistic yamalama + invalidate turu üretirdi.
 * Kullanıcı bir bloğu tutup bıraktığında ağın çalışmasını beklemek
 * zorunda değil.
 */
export function resolveDrop(result: DragResult): DropIntent {
  const { task, targetDate, targetStart, targetDuration } = result;

  // Yazılmamış görev hiçbir yere taşınamaz.
  if (isPendingTask(task.id)) return { kind: "none" };

  // ── Saatsiz şeride bırakıldı ──
  if (targetStart === null) {
    // Zaten saatsizse ve gün değişmediyse yapılacak bir şey yok.
    if (task.startTime === null && task.dueDate === targetDate) {
      return { kind: "none" };
    }
    // Not: şeride bırakmak günü de değiştirebilir, ama o durumda saat
    // zaten silindiği için `unschedule` yetmez — gün taşımasını
    // `move` üstlenir. Saatsiz + gün değişimi ayrı ele alınır.
    if (task.dueDate !== targetDate) {
      return { kind: "none" };
    }
    return { kind: "unschedule", id: task.id };
  }

  const startTime = formatTime(targetStart);

  // ── Saatsizden ızgaraya: ilk kez saat kazanıyor ──
  if (task.startTime === null) {
    return {
      kind: "schedule",
      id: task.id,
      dueDate: targetDate,
      startTime,
      durationMinutes: targetDuration ?? 30,
    };
  }

  const sameDay = task.dueDate === targetDate;
  const sameTime = task.startTime === startTime;
  const sameDuration = task.durationMinutes === targetDuration;

  if (sameDay && sameTime && sameDuration) return { kind: "none" };

  if (sameDay) {
    return {
      kind: "time",
      id: task.id,
      startTime,
      durationMinutes: targetDuration,
    };
  }

  return {
    kind: "move",
    id: task.id,
    dueDate: targetDate,
    startTime,
    durationMinutes: targetDuration,
  };
}
