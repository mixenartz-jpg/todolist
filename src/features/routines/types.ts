import type { DateStr, IsoWeekday, Period } from "@/lib/date/types";

/**
 * Rutin programı — dört rutin tipinin üçü buradadır.
 *
 * Dördüncü tip (sayısal hedef) ayrı bir `kind` değildir: `target` +
 * `unit` alanları herhangi bir programla birleşir. "Günde 8 bardak su"
 * = daily + target 8; "Pzt/Çrş/Cum 45 dk koşu" = weekdays + target 45.
 * Bu sayede sayısal hedefler kombinatoryal patlamaya yol açmaz.
 */
export type Schedule =
  | { kind: "daily" }
  | { kind: "weekdays"; days: IsoWeekday[] } // ISO: Pzt=1 … Paz=7
  | { kind: "flexible"; count: number; per: Period };

export type ScheduleKind = Schedule["kind"];

/**
 * Bir rutinin belirli bir gündeki yükümlülüğü.
 *
 * Esnek rutinlerde hiçbir GÜN zorunlu değildir; yükümlülük DÖNEM
 * düzeyindedir ("bu hafta 3 kez"). Bu ayrımı tip sisteminde görünür
 * kılmak, tüketicilerin ikisini karıştırmasını engeller.
 */
export type Obligation =
  | { level: "day" }
  | { level: "period"; per: Period; count: number };

/** Programın belirli bir tarihten itibaren geçerli olan sürümü. */
export interface ScheduleVersion {
  effectiveFrom: DateStr;
  schedule: Schedule;
}

/**
 * Rutin + tam program zaman çizelgesi.
 *
 * `versions` daima en az bir eleman içerir ve `effectiveFrom`'a göre
 * ARTAN sıralıdır. Sıralama `scheduleAt`'in doğruluğu için ön koşuldur.
 */
export interface RoutineWithSchedule {
  id: string;
  name: string;
  icon: string | null;
  colorSlot: number;
  target: number;
  unit: string | null;
  startDate: DateStr;
  archivedAt: DateStr | null;
  sortOrder: number;
  versions: ScheduleVersion[];
}

/** Rutin oluşturma/düzenleme formunun taşıdığı veri. */
export interface RoutineDraft {
  name: string;
  icon: string | null;
  colorSlot: number;
  target: number;
  unit: string | null;
  schedule: Schedule;
}
