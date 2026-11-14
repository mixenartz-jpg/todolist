import { addDays, isoWeekday, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { MONTHS, WEEKDAYS_SHORT, WEEKDAYS_LONG } from "@/lib/ui/tr";

/** Gün şeridi: geriye 14, ileriye 7 gün. */
export const STRIP_BACK = 14;
export const STRIP_AHEAD = 7;

export function stripDays(today: DateStr, back = STRIP_BACK, ahead = STRIP_AHEAD): DateStr[] {
  const out: DateStr[] = [];
  for (let i = -back; i <= ahead; i++) out.push(addDays(today, i));
  return out;
}

/** "3 Kas Sal" */
export function chipLabel(date: DateStr): string {
  const { month, day } = toParts(date);
  return `${day} ${MONTHS[month].slice(0, 3)} ${WEEKDAYS_SHORT[isoWeekday(date)]}`;
}

/** "14 Kasım Cumartesi" */
export function headline(date: DateStr): string {
  const { month, day } = toParts(date);
  return `${day} ${MONTHS[month]} ${WEEKDAYS_LONG[isoWeekday(date)]}`;
}

export type DayMode = "past" | "today" | "future";

export function dayMode(date: DateStr, today: DateStr): DayMode {
  if (date === today) return "today";
  return date < today ? "past" : "future";
}

/** Öğrenci geçmiş ve bugünü düzenler; geleceği yalnızca görür. */
export function isEditableDay(date: DateStr, today: DateStr, readOnly: boolean): boolean {
  return !readOnly && date <= today;
}
