import { addDays, isoWeekday } from "@/lib/date/date";
import type { DateStr, IsoWeekday } from "@/lib/date/types";

/*
 * Dağıt (toplu planlama) ve Kaydır — saf hesaplar.
 *
 * Birim: test kaynağında TEST (bölünmez), diğerlerinde soru/sayfa/ders.
 * Yalnızca BOŞ birimler (gri / kırmızı) dağıtılır; sarılar (atanmış ya
 * da elle "ödevlendirildi") atlanır — bkz. `unitStatus.isFree`.
 */

export interface Unit {
  sectionId: string;
  number: number;
}

/** Bir kaynağın (ve seçili bölümlerinin) dağıtılacak boş birimleri, sırayla. */
export interface Slice {
  key: string;
  units: readonly Unit[];
}

export type DistributeMode = { kind: "days"; days: number } | { kind: "perDay"; perDay: number };

/** Atlanan hafta günleri dışında, `start`tan itibaren `count` gün. */
export function workingDays(start: DateStr, count: number, skip: ReadonlySet<IsoWeekday>): DateStr[] {
  if (skip.size >= 7 || count <= 0) return [];
  const out: DateStr[] = [];
  for (let d = start; out.length < count; d = addDays(d, 1)) {
    if (!skip.has(isoWeekday(d))) out.push(d);
  }
  return out;
}

/** `date`ten `n` çalışma günü ileri (atlanan günler sayılmaz, üstüne düşülmez). */
export function addWorkingDays(date: DateStr, n: number, skip: ReadonlySet<IsoWeekday>): DateStr {
  if (skip.size >= 7) return date;
  let d = date;
  let left = n;
  while (left > 0) {
    d = addDays(d, 1);
    if (!skip.has(isoWeekday(d))) left--;
  }
  // Başlangıç günü atlanan bir güne düşüyorsa (n = 0) ilk çalışma gününe kay.
  while (skip.has(isoWeekday(d))) d = addDays(d, 1);
  return d;
}

/**
 * Bir dilimi `days` güne mümkün olduğunca EŞİT, tam birimlerle böl;
 * kalan son güne gider. Birim günden azsa her güne birer birim (ilk
 * günlerden başlayarak) — boş günler sona kalır.
 */
export function splitEven<T>(units: readonly T[], days: number): T[][] {
  const out: T[][] = Array.from({ length: Math.max(0, days) }, () => []);
  if (days <= 0 || units.length === 0) return out;
  const base = Math.floor(units.length / days);
  if (base === 0) {
    units.forEach((u, i) => out[i].push(u));
    return out;
  }
  let i = 0;
  for (let d = 0; d < days; d++) {
    const take = d === days - 1 ? units.length - i : base;
    out[d] = units.slice(i, i + take);
    i += take;
  }
  return out;
}

/** Günlük sabit miktar: `perDay`'lik parçalar, kalan son parçada. */
export function splitPerDay<T>(units: readonly T[], perDay: number): T[][] {
  const out: T[][] = [];
  if (perDay < 1) return out;
  for (let i = 0; i < units.length; i += perDay) out.push(units.slice(i, i + perDay));
  return out;
}

export interface DistributionRow {
  date: DateStr;
  /** Dilim anahtarı → o günün birimleri (boş olabilir). */
  cells: Map<string, Unit[]>;
}

/**
 * Dilimleri günlere dağıt. "gün sayısı" kipinde her dilim aynı günlere
 * eşit bölünür; "günlük miktar" kipinde her dilim kendi hızında ilerler
 * ve gün sayısı en uzun dilime göre belirlenir.
 */
export function distribute(
  slices: readonly Slice[],
  start: DateStr,
  mode: DistributeMode,
  skip: ReadonlySet<IsoWeekday>,
): DistributionRow[] {
  const chunks = new Map<string, Unit[][]>();
  for (const s of slices) {
    chunks.set(s.key, mode.kind === "days" ? splitEven(s.units, mode.days) : splitPerDay(s.units, mode.perDay));
  }
  const dayCount =
    mode.kind === "days" ? mode.days : Math.max(0, ...[...chunks.values()].map((c) => c.length));
  const dates = workingDays(start, dayCount, skip);
  return dates.map((date, i) => ({
    date,
    cells: new Map(slices.map((s) => [s.key, chunks.get(s.key)?.[i] ?? []])),
  }));
}

/** Günün toplam süresi (dk): mevcut yük + bu dağıtımın hücreleri. */
export function rowMinutes(
  row: DistributionRow,
  minutesPerUnit: ReadonlyMap<string, number | null>,
  existing: number,
): number {
  let total = existing;
  for (const [key, units] of row.cells) total += units.length * (minutesPerUnit.get(key) ?? 0);
  return Math.round(total);
}

/** "39-42, 45" → [39,40,41,42,45]; hatalıysa null. */
export function parseNumberList(text: string): number[] | null {
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return [];
  const out: number[] = [];
  for (const p of parts) {
    const m = /^(\d+)(?:\s*[-–—]\s*(\d+))?$/.exec(p);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (b < a || b - a > 5000) return null;
    for (let n = a; n <= b; n++) out.push(n);
  }
  return [...new Set(out)].sort((x, y) => x - y);
}

// ──────────────────────────── Kaydır ────────────────────────────────

export interface ShiftTask {
  id: string;
  dueDate: DateStr | null;
  /** Sonucu girilmiş görev yerinde kalır. */
  hasResult: boolean;
}

/**
 * Dağıtımda `from` ve sonrasındaki, sonucu GİRİLMEMİŞ görevleri `n`
 * çalışma günü ileri it. Atlanan günlere düşülmez; sonuçlu görevler
 * yerinde kalır.
 */
export function shiftTasks(
  tasks: readonly ShiftTask[],
  from: DateStr,
  n: number,
  skip: ReadonlySet<IsoWeekday>,
): Array<{ id: string; dueDate: DateStr }> {
  if (n <= 0) return [];
  return tasks
    .filter((t) => t.dueDate !== null && t.dueDate >= from && !t.hasResult)
    .map((t) => ({ id: t.id, dueDate: addWorkingDays(t.dueDate!, n, skip) }));
}

/** Dağıtımı sil: yalnızca sonucu girilmemiş görevler. */
export function deletableTasks(tasks: readonly ShiftTask[]): string[] {
  return tasks.filter((t) => !t.hasResult).map((t) => t.id);
}
