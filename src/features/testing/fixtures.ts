/**
 * Test fixture'ları.
 *
 * Rutin nesnelerini elle yazmak testleri okunmaz kılar; bu yardımcılar
 * seri ve tamamlanma testlerini tek satıra indirir.
 */

import { addDays, asDateStr, eachDay } from "@/lib/date/date";
import type { RoutineWithSchedule, Schedule, ScheduleVersion } from "@/features/routines/types";
import { entryKey, type EntryMap } from "@/features/entries/entry-map";
import type { Mistake } from "@/features/mistakes/types";
import type { Category, PlanGoal } from "@/features/planlama/types";
import type { Task } from "@/features/tasks/types";

let counter = 0;

interface RoutineOptions {
  id?: string;
  name?: string;
  /** Tek program (tüm zaman boyunca geçerli). `versions` ile birlikte kullanılmaz. */
  schedule?: Schedule;
  /** Zaman içinde değişen program. Verilirse `schedule` yok sayılır. */
  versions?: Array<{ from: string; schedule: Schedule }>;
  target?: number;
  unit?: string | null;
  startDate?: string;
  archivedAt?: string | null;
  colorSlot?: number;
  sortOrder?: number;
}

/** Test için rutin üretir. Varsayılan: her gün, hedef 1, 2020'den beri aktif. */
export function routine(options: RoutineOptions = {}): RoutineWithSchedule {
  const startDate = asDateStr(options.startDate ?? "2020-01-01");

  const versions: ScheduleVersion[] = options.versions
    ? options.versions.map((v) => ({
        effectiveFrom: asDateStr(v.from),
        schedule: v.schedule,
      }))
    : [{ effectiveFrom: startDate, schedule: options.schedule ?? { kind: "daily" } }];

  return {
    id: options.id ?? `r${++counter}`,
    name: options.name ?? "Test rutini",
    icon: null,
    colorSlot: options.colorSlot ?? 0,
    target: options.target ?? 1,
    unit: options.unit ?? null,
    startDate,
    archivedAt: options.archivedAt ? asDateStr(options.archivedAt) : null,
    sortOrder: options.sortOrder ?? 0,
    versions,
  };
}

/**
 * Girdi haritasını desen string'inden üretir.
 *
 * Desen karakterleri, `from` tarihinden başlayarak birer gün ilerler:
 *   `X` → hedef tamamlandı (value = target)
 *   `.` → kayıt yok
 *   `1`-`9` → o sayısal değer (kısmi ilerleme testleri için)
 *
 * Örnek: entries(r, '2026-08-03', 'XX.X') →
 *   3 Ağu tamam, 4 Ağu tamam, 5 Ağu boş, 6 Ağu tamam
 */
export function entries(
  r: RoutineWithSchedule,
  from: string,
  pattern: string,
): EntryMap {
  const map = new Map<string, number>();
  let date = asDateStr(from);

  for (const ch of pattern) {
    if (ch === "X") {
      map.set(entryKey(r.id, date), r.target);
    } else if (ch >= "1" && ch <= "9") {
      map.set(entryKey(r.id, date), Number(ch));
    }
    // '.' ve diğer karakterler: kayıt yok
    date = addDays(date, 1);
  }

  return map;
}

/** Birden fazla rutinin girdilerini tek haritada birleştirir. */
export function mergeEntries(...maps: EntryMap[]): EntryMap {
  const out = new Map<string, number>();
  for (const m of maps) for (const [k, v] of m) out.set(k, v);
  return out;
}

/** Boş girdi haritası. */
export const noEntries: EntryMap = new Map();

/** Belirli günlere tek tek değer atar. */
export function entriesOn(
  r: RoutineWithSchedule,
  dates: Record<string, number>,
): EntryMap {
  const map = new Map<string, number>();
  for (const [date, value] of Object.entries(dates)) {
    map.set(entryKey(r.id, asDateStr(date)), value);
  }
  return map;
}

interface MistakeOptions {
  id?: string;
  ders?: string;
  konu?: string;
  date?: string;
  note?: string | null;
  imagePath?: string | null;
  /** Tamamlanan tekrar sayısı (0..4). 4 = mezun. */
  reviewStage?: number;
  /** Açıkça verilmezse `reviewStage`'e göre türetilir. */
  nextReviewDate?: string | null;
}

/**
 * Test için yanlış üretir.
 *
 * `nextReviewDate` verilmezse tutarlı bir durum türetilir: mezun aşama
 * için null, aksi halde tarihten bir gün sonra. Böylece çoğu test
 * tekrar durumunu hiç düşünmek zorunda kalmaz.
 */
export function mistake(options: MistakeOptions = {}): Mistake {
  const date = asDateStr(options.date ?? "2026-08-01");
  const reviewStage = options.reviewStage ?? 0;

  const nextReviewDate =
    options.nextReviewDate === undefined
      ? reviewStage >= 4
        ? null
        : addDays(date, 1)
      : options.nextReviewDate === null
        ? null
        : asDateStr(options.nextReviewDate);

  return {
    id: options.id ?? `m${++counter}`,
    ders: options.ders ?? "Matematik",
    konu: options.konu ?? "Türev",
    date,
    note: options.note ?? null,
    imagePath: options.imagePath ?? null,
    imageWidth: null,
    imageHeight: null,
    reviewStage,
    nextReviewDate,
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
  };
}

interface TaskOptions {
  id?: string;
  title?: string;
  /** null → tarihsiz görev ("bir ara"). Verilmezse tarihsizdir. */
  dueDate?: string | null;
  done?: boolean;
  note?: string | null;
  sortOrder?: number;
  startTime?: string | null;
  durationMinutes?: number | null;
  categoryId?: string | null;
  goalId?: string | null;
}

/**
 * Test için görev üretir.
 *
 * Varsayılan TARİHSİZ ve tamamlanmamıştır: hafta testlerinin çoğu
 * tarihi açıkça verir ve varsayılanın "bugün" olması, testin yazıldığı
 * güne bağlı sinsi bir kırılganlık doğururdu.
 *
 * `categoryId`/`goalId` varsayılanı null: görevlerin çoğu
 * sınıflandırılmaz ve mevcut testlerin hiçbiri bu alanları bilmek
 * zorunda değil.
 */
export function task(options: TaskOptions = {}): Task {
  return {
    id: options.id ?? `t${++counter}`,
    title: options.title ?? "Test görevi",
    dueDate: options.dueDate == null ? null : asDateStr(options.dueDate),
    done: options.done ?? false,
    note: options.note ?? null,
    sortOrder: options.sortOrder ?? 0,
    startTime: options.startTime ?? null,
    durationMinutes: options.durationMinutes ?? null,
    categoryId: options.categoryId ?? null,
    goalId: options.goalId ?? null,
  };
}

interface CategoryOptions {
  id?: string;
  name?: string;
  colorSlot?: number;
  sortOrder?: number;
  archivedAt?: string | null;
}

/** Test için kategori üretir. Varsayılan: etkin, slot 0. */
export function category(options: CategoryOptions = {}): Category {
  return {
    id: options.id ?? `c${++counter}`,
    name: options.name ?? "Test kategorisi",
    colorSlot: options.colorSlot ?? 0,
    sortOrder: options.sortOrder ?? 0,
    archivedAt: options.archivedAt ?? null,
  };
}

interface PlanGoalOptions {
  id?: string;
  /** Ayın 1'i olmalı; verilmezse 2026-08. */
  month?: string;
  title?: string;
  note?: string | null;
  /** null → ilerleme bağlı görevlerden okunur. Varsayılan budur. */
  targetCount?: number | null;
  doneCount?: number;
  colorSlot?: number;
  sortOrder?: number;
  archivedAt?: string | null;
}

/**
 * Test için aylık hedef üretir.
 *
 * Varsayılan `targetCount: null` — yani ilerleme bağlı görevlerden
 * okunur. Sayısal hedefi olan durum testte AÇIKÇA belirtilmeli, çünkü
 * iki ölçüm biçimi arasındaki fark bu modülün asıl konusu.
 */
export function planGoal(options: PlanGoalOptions = {}): PlanGoal {
  return {
    id: options.id ?? `g${++counter}`,
    month: asDateStr(options.month ?? "2026-08-01"),
    title: options.title ?? "Test hedefi",
    note: options.note ?? null,
    targetCount: options.targetCount ?? null,
    doneCount: options.doneCount ?? 0,
    colorSlot: options.colorSlot ?? 0,
    sortOrder: options.sortOrder ?? 0,
    archivedAt: options.archivedAt ?? null,
  };
}

/** Bir aralıktaki tüm günleri tamamlanmış işaretler. */
export function completedRange(
  r: RoutineWithSchedule,
  from: string,
  to: string,
): EntryMap {
  const map = new Map<string, number>();
  for (const date of eachDay(asDateStr(from), asDateStr(to))) {
    map.set(entryKey(r.id, date), r.target);
  }
  return map;
}

