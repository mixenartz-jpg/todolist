/**
 * Program mantığı — "bu rutin bu gün zorunlu mu?" sorusunun tek cevabı.
 *
 * Saf fonksiyonlar: I/O yok, `Date` yok, yan etki yok. Bu sayede
 * kapsamlı test edilebilir ve gerekirse aynen bir Edge Function'a
 * taşınabilir.
 */

import { compareDates, isoWeekday } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type {
  Obligation,
  RoutineWithSchedule,
  Schedule,
  ScheduleVersion,
} from "./types";

/**
 * D tarihinde geçerli olan program sürümü.
 *
 * Kural: `effectiveFrom <= D` olan sürümlerin EN GEÇ tarihlisi. Tam
 * `effectiveFrom` gününde yeni program geçerlidir (o gün dahildir).
 *
 * D, ilk sürümün başlangıcından önceyse `null` döner — o tarihte
 * rutinin henüz bir programı yoktur.
 */
export function scheduleAt(
  r: RoutineWithSchedule,
  date: DateStr,
): Schedule | null {
  let found: ScheduleVersion | null = null;

  // Sürümler artan sıralı; ilk "gelecek" sürümde durabiliriz.
  for (const v of r.versions) {
    if (compareDates(v.effectiveFrom, date) > 0) break;
    found = v;
  }

  return found?.schedule ?? null;
}

/**
 * Rutin bu tarihte izleniyor mu?
 *
 * `startDate` öncesi hayır (yeni rutin geçmişi kaçırılmış saymaz),
 * `archivedAt` ve sonrası hayır (arşiv geleceği kapatır, geçmişi değil).
 */
export function isActiveOn(r: RoutineWithSchedule, date: DateStr): boolean {
  if (compareDates(date, r.startDate) < 0) return false;
  if (r.archivedAt !== null && compareDates(date, r.archivedAt) >= 0) return false;
  return true;
}

/**
 * Rutin bu GÜN zorunlu mu?
 *
 * Esnek rutinlerde daima `false` — hiçbir tek gün zorunlu değildir,
 * yükümlülük dönem düzeyindedir. Bu yüzden "bugün kaçırdım mı?"
 * sorusu esnek rutinler için anlamsızdır; onların ilerlemesi
 * `periodProgress` ile ölçülür.
 */
export function isDueOn(r: RoutineWithSchedule, date: DateStr): boolean {
  if (!isActiveOn(r, date)) return false;

  const schedule = scheduleAt(r, date);
  if (schedule === null) return false;

  switch (schedule.kind) {
    case "daily":
      return true;
    case "weekdays":
      return schedule.days.includes(isoWeekday(date));
    case "flexible":
      return false;
  }
}

/**
 * Bu tarihteki yükümlülüğün düzeyi: gün mü, dönem mi?
 *
 * Rutin o tarihte aktif değilse veya o gün gün-düzeyinde zorunlu
 * değilse `null` döner.
 */
export function obligationAt(
  r: RoutineWithSchedule,
  date: DateStr,
): Obligation | null {
  if (!isActiveOn(r, date)) return null;

  const schedule = scheduleAt(r, date);
  if (schedule === null) return null;

  switch (schedule.kind) {
    case "daily":
      return { level: "day" };
    case "weekdays":
      return schedule.days.includes(isoWeekday(date)) ? { level: "day" } : null;
    case "flexible":
      return { level: "period", per: schedule.per, count: schedule.count };
  }
}

/** Rutin bu tarihte esnek mi? (dönem bazlı hesaplamalara girer mi) */
export function isFlexibleOn(r: RoutineWithSchedule, date: DateStr): boolean {
  return scheduleAt(r, date)?.kind === "flexible";
}

/** Rutinin sayısal hedefi var mı? (target > 1 veya birim tanımlı) */
export function isNumeric(r: RoutineWithSchedule): boolean {
  return r.target > 1 || r.unit !== null;
}

/**
 * Program sürümlerini artan sıraya dizer ve aynı güne düşen
 * sürümlerden sonuncusunu tutar.
 *
 * `scheduleAt` sıralı girdi varsayar; sunucudan gelen veri bu
 * fonksiyondan geçirilir.
 */
export function normalizeVersions(
  versions: readonly ScheduleVersion[],
): ScheduleVersion[] {
  const byDate = new Map<DateStr, ScheduleVersion>();
  for (const v of versions) byDate.set(v.effectiveFrom, v);

  return [...byDate.values()].sort((a, b) =>
    compareDates(a.effectiveFrom, b.effectiveFrom),
  );
}

/** İnsan tarafından okunur program açıklaması (Türkçe). */
const WEEKDAY_SHORT = ["", "Pzt", "Sal", "Çrş", "Prş", "Cum", "Cmt", "Paz"];

export function describeSchedule(s: Schedule): string {
  switch (s.kind) {
    case "daily":
      return "Her gün";
    case "weekdays": {
      const days = [...s.days].sort((a, b) => a - b);
      if (days.length === 7) return "Her gün";
      return days.map((d) => WEEKDAY_SHORT[d]).join(", ");
    }
    case "flexible":
      return s.per === "week"
        ? `Haftada ${s.count} kez`
        : `Ayda ${s.count} kez`;
  }
}
