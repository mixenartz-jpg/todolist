/**
 * Test fixture'ları.
 *
 * Rutin nesnelerini elle yazmak testleri okunmaz kılar; bu yardımcılar
 * seri ve tamamlanma testlerini tek satıra indirir.
 */

import { addDays, asDateStr, eachDay } from "@/lib/date/date";
import type { RoutineWithSchedule, Schedule, ScheduleVersion } from "@/features/routines/types";
import { entryKey, type EntryMap } from "@/features/entries/entry-map";
import type { Category, GoalNode, PlanGoal } from "@/features/planlama/types";
import type { Task } from "@/features/tasks/types";
import type { DenemeYanlis } from "@/features/deneme/types";

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

interface TaskOptions {
  id?: string;
  title?: string;
  /** null → tarihsiz görev ("bir ara"). Verilmezse tarihsizdir. */
  dueDate?: string | null;
  done?: boolean;
  note?: string | null;
  sortOrder?: number;
  /** ISO damga; arşiv testleri için. */
  completedAt?: string | null;
  categoryId?: string | null;
  goalId?: string | null;
  /** Görevi bir plan düğümüne bağlar (0022). */
  nodeId?: string | null;
  colorSlot?: number | null;
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
    completedAt: options.completedAt ?? null,
    categoryId: options.categoryId ?? null,
    goalId: options.goalId ?? null,
    nodeId: options.nodeId ?? null,
    colorSlot: options.colorSlot ?? null,
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

interface GoalNodeOptions {
  id?: string;
  /** Ağacın hedefi; verilmezse "g1". */
  planGoalId?: string;
  /** null → kök düğüm (depth 1). Varsayılan budur. */
  parentId?: string | null;
  /** Verilmezse `parentId`'den türetilir: kök 1, çocuk 2. */
  depth?: number;
  title?: string;
  note?: string | null;
  sortOrder?: number;
}

/**
 * Test için hedef ağacı düğümü üretir.
 *
 * `depth` verilmezse `parentId`'den kabaca türetilir (kök → 1, çocuk →
 * 2). Üç seviyeli ağaç kuran testler depth'i AÇIKÇA vermeli: gerçekte
 * onu sunucu hesaplıyor ve fixture'ın tahmin yürütmesi, testin
 * sunucudan farklı bir ağaç kurmasına yol açardı.
 */
export function goalNode(options: GoalNodeOptions = {}): GoalNode {
  const parentId = options.parentId ?? null;

  return {
    id: options.id ?? `n${++counter}`,
    planGoalId: options.planGoalId ?? "g1",
    parentId,
    depth: options.depth ?? (parentId === null ? 1 : 2),
    title: options.title ?? "Test başlığı",
    note: options.note ?? null,
    sortOrder: options.sortOrder ?? 0,
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


interface DenemeYanlisOptions {
  id?: string;
  denemeId?: string;
  ders?: string;
  konu?: string | null;
  hataTuru?: DenemeYanlis["hataTuru"];
  reviewStage?: number;
  /** `undefined` → stage'e göre türetilir; `null` → mezun. */
  nextReviewDate?: string | null;
}

/**
 * Test için deneme yanlışı üretir.
 *
 * Varsayılan: etiketlenmemiş, ilk tekrarı bekleyen yeni bir yanlış —
 * gerçek hayattaki en yaygın hâli (deneme biter, fotoğraf çekilir,
 * etiketleme sonraki oturuma kalır).
 */
export function denemeYanlis(
  options: DenemeYanlisOptions = {},
): DenemeYanlis {
  const reviewStage = options.reviewStage ?? 0;

  return {
    id: options.id ?? `y${++counter}`,
    denemeId: options.denemeId ?? "d1",
    ders: options.ders ?? "Matematik",
    konu: options.konu ?? null,
    soruNo: null,
    hataTuru: options.hataTuru ?? null,
    note: null,
    imagePath: null,
    imageWidth: null,
    imageHeight: null,
    reviewStage,
    nextReviewDate:
      options.nextReviewDate === undefined
        ? asDateStr("2026-09-02")
        : options.nextReviewDate === null
          ? null
          : asDateStr(options.nextReviewDate),
  };
}
