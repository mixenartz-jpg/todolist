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

