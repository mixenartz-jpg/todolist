import { addDays, isoWeekday, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { completionTone, TONE_COLOR } from "@/features/results/format";
import type { Task } from "@/features/tasks/types";
import { MONTHS, WEEKDAYS_LONG, WEEKDAYS_SHORT } from "@/lib/ui/tr";

/**
 * Gün ekranının kipi — öğrenci ekranı ile koçun Planlama → Gün
 * görünümü AYNI bileşenleri bu bayrakla paylaşır:
 *   student: öğrenci kendi gününü doldurur
 *   coach:   koç planı düzenler; öğrenci verisi salt okunur, koç notu yazılır
 *   preview: koç öğrenci ekranını öğrenci gözüyle görür; her şey salt okunur
 */
export type DayMode = "student" | "coach" | "preview";

/** Öğrenci şeridi: geriye 14, ileriye 7 gün (bugüne sabit). */
export const STRIP_BACK = 14;
export const STRIP_AHEAD = 7;
/** Koç şeridi seçili günün ETRAFINDA kayar: uç çipe basmak pencereyi taşır. */
export const COACH_STRIP_RADIUS = 14;

export function stripDays(center: DateStr, back = STRIP_BACK, ahead = STRIP_AHEAD): DateStr[] {
  const out: DateStr[] = [];
  for (let i = -back; i <= ahead; i++) out.push(addDays(center, i));
  return out;
}

/** Kipe göre şerit: öğrencide bugüne sabit, koçta seçili güne göre. */
export function stripFor(mode: DayMode, selected: DateStr, today: DateStr): DateStr[] {
  if (mode === "coach") return stripDays(selected, COACH_STRIP_RADIUS, COACH_STRIP_RADIUS);
  const days = stripDays(today);
  // Öğrenci şerit dışı bir güne bağlantıyla geldiyse o gün de görünsün.
  if (!days.includes(selected)) days.push(selected);
  return days.sort();
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

export type DayKind = "past" | "today" | "future";

export function dayMode(date: DateStr, today: DateStr): DayKind {
  if (date === today) return "today";
  return date < today ? "past" : "future";
}

/**
 * Öğrenci her günü düzenler: geçmişi düzeltir, bugünü doldurur,
 * gelecekteki görevi ERKEN yapabilir (yapıldığı gün `done_on`'a
 * yazılır, yüzde planlanan güne göre kalır). `date`/`today` imzada
 * kalıyor: kural ileride yeniden güne bağlanabilir.
 */
export function isEditableDay(_date: DateStr, _today: DateStr, readOnly: boolean): boolean {
  return !readOnly;
}

/**
 * Çip noktası: yeşil ≥%70, sarı, kırmızı; gelecek ya da görevsiz gün
 * gri. Eşikler `completionTone` ile aynı (üst karttaki yüzde rengi).
 */
export const DOT_EMPTY = "var(--color-ink-4)";

export function dayDot(date: DateStr, today: DateStr, tasks: readonly Task[]): string {
  if (date > today) return DOT_EMPTY;
  const day = tasks.filter((t) => t.dueDate === date);
  if (day.length === 0) return DOT_EMPTY;
  return TONE_COLOR[completionTone(day.filter((t) => t.done).length / day.length)];
}

export function dayDots(days: readonly DateStr[], today: DateStr, tasks: readonly Task[]): Map<DateStr, string> {
  return new Map(days.map((d) => [d, dayDot(d, today, tasks)]));
}
