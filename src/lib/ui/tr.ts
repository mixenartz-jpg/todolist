/**
 * Türkçe etiketler ve biçimlendirme.
 *
 * Hafta Pazartesi başlar; dizilerin indeksi ISO gün numarasıyla
 * eşleşsin diye 0. eleman boştur (Pzt=1 … Paz=7).
 */

import { addDays, toParts } from "@/lib/date/date";
import type { DateStr, IsoWeekday } from "@/lib/date/types";

export const MONTHS = [
  "",
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

/** Pzt=1 … Paz=7 */
export const WEEKDAYS_SHORT = ["", "Pzt", "Sal", "Çrş", "Prş", "Cum", "Cmt", "Paz"] as const;

/**
 * Matris başlığı için iki harf.
 *
 * Tek harf kullanılamaz: Pazartesi, Perşembe ve Pazar hepsi "P",
 * Cuma ile Cumartesi ikisi de "C" olurdu — sütunlar ayırt edilemezdi.
 */
export const WEEKDAYS_MIN = ["", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"] as const;

export const WEEKDAYS_LONG = [
  "",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

export function monthName(month: number): string {
  return MONTHS[month] ?? "";
}

export function weekdayShort(day: IsoWeekday): string {
  return WEEKDAYS_SHORT[day];
}

/** "5 Ağustos 2026" */
export function formatLongDate(date: DateStr): string {
  const { year, month, day } = toParts(date);
  return `${day} ${MONTHS[month]} ${year}`;
}

/** "5 Ağustos" */
export function formatShortDate(date: DateStr): string {
  const { month, day } = toParts(date);
  return `${day} ${MONTHS[month]}`;
}

/**
 * "Bugün", "Yarın", "Dün", yoksa "5 Ağustos". null → "Tarihsiz"
 * (havuzdaki görev).
 */
export function formatRelativeDay(date: DateStr | null, today: DateStr): string {
  if (date === null) return "Tarihsiz";
  if (date === today) return "Bugün";
  if (date === addDays(today, 1)) return "Yarın";
  if (date === addDays(today, -1)) return "Dün";
  return formatShortDate(date);
}

/**
 * Birden çok günü tek satırda: aynı aydaki tarihler birleşir.
 *
 *   [Bugün, 27 Eyl, 28 Eyl, 1 Eki] → "Bugün, 27, 28 Eylül, 1 Ekim"
 *
 * Günler sıralı gelmeli (çağıran `sentTasksByNode` sırasını
 * kullanıyor). Bugün/Yarın/Dün kelimeyle kalır.
 */
export function formatDayList(
  dates: readonly (DateStr | null)[],
  today: DateStr,
): string {
  /** Her parça ya düz bir etiket ya da aynı aya ait gün numaraları. */
  const parts: { month: string | null; items: string[] }[] = [];

  for (const date of dates) {
    const label = formatRelativeDay(date, today);
    const match = /^(\d+) (\S+)$/.exec(label);
    const last = parts[parts.length - 1];

    if (match === null) {
      parts.push({ month: null, items: [label] });
    } else if (last !== undefined && last.month === match[2]) {
      last.items.push(match[1]!);
    } else {
      parts.push({ month: match[2]!, items: [match[1]!] });
    }
  }

  return parts
    .map((p) => (p.month === null ? p.items[0] : `${p.items.join(", ")} ${p.month}`))
    .join(", ");
}

/** "Ağustos 2026" */
export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

/**
 * Hafta aralığı: "3–9 Ağustos".
 *
 * Ay aynıysa ay adı TEK KEZ yazılır; aylar farklıysa iki kez
 * ("29 Eylül – 5 Ekim"); yıllar da farklıysa yıllar eklenir
 * ("28 Aralık 2026 – 3 Ocak 2027").
 *
 * Her zaman uzun biçim ("3 Ağustos 2026 – 9 Ağustos 2026") yazmak
 * başlığı gereksiz uzatır ve haftanın hangi ay içinde olduğunu
 * okumayı zorlaştırır — tekrarlanan bilgi göz tarafından ayıklanmak
 * zorunda kalır. Yıl yalnızca gerçekten ayırt edici olduğunda görünür.
 *
 * Ayraç yarım tire (–), kısa çizgi değil: sayı aralığının tipografik
 * karşılığı odur ve "3-9" bir çıkarma gibi okunabilir.
 */
export function formatWeekRange(start: DateStr, end: DateStr): string {
  const a = toParts(start);
  const b = toParts(end);

  if (a.year !== b.year) {
    return `${a.day} ${MONTHS[a.month]} ${a.year} – ${b.day} ${MONTHS[b.month]} ${b.year}`;
  }

  if (a.month !== b.month) {
    return `${a.day} ${MONTHS[a.month]} – ${b.day} ${MONTHS[b.month]}`;
  }

  return `${a.day}–${b.day} ${MONTHS[a.month]}`;
}

/**
 * Seri birimini Türkçeleştirir.
 *
 * Esnek rutinlerde seri HAFTA/AY birimiyle sayılır. Birimsiz bir "5"
 * göstermek hatadır: kullanıcı onu gün sanır.
 */
export function streakLabel(count: number, unit: "day" | "week" | "month"): string {
  const noun = unit === "day" ? "gün" : unit === "week" ? "hafta" : "ay";
  return `${count} ${noun}`;
}

/** Sayısal değeri birimiyle biçimlendirir: "5/8 bardak" */
export function formatProgress(
  value: number,
  target: number,
  unit: string | null,
): string {
  const base = target > 1 ? `${trim(value)}/${trim(target)}` : `${trim(value)}`;
  return unit ? `${base} ${unit}` : base;
}

/** Gereksiz ondalık sıfırları atar: 5.0 → "5", 2.5 → "2,5" */
function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

/** Yüzdeyi tam sayı olarak biçimlendirir. */
export function formatPercent(ratio: number): string {
  return `%${Math.round(ratio * 100)}`;
}
