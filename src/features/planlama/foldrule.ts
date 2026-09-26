import type { DateStr } from "@/lib/date/types";
import type { WeekSummary } from "./weekmap";

/**
 * Varsayılan katlama kuralı — geçmiş kapalı, gelecekten yalnızca SIRADAKİ.
 *
 * ── Neden? ──
 * Hafta ölçeğinde yedi günün hepsi açık gelince geçmiş günlerin
 * bitmiş işleri ve ileride henüz bakılmayacak günler ekranı
 * dolduruyordu; kullanıcının asıl baktığı bugün ve yarın aşağıda
 * kayboluyordu. Açık kalan: bugün ve ondan sonraki İLK gün.
 *
 * "Sıradaki gün" aralık içindeki bugünden sonraki ilk gündür — bugünü
 * içeren haftada yarın, tamamen ileride bir haftada o haftanın ilk
 * günü (kullanıcı oraya plan yapmaya gitti; hepsi kapalı gelmemeli).
 * Tamamen geçmiş bir haftada her gün kapalı.
 *
 * Kural yalnızca VARSAYILANI belirler; kullanıcı her günü tek tek
 * açıp kapatabilir (bkz. useCollapsedDays).
 */
export function defaultCollapsed(
  date: DateStr,
  today: DateStr,
  dates: readonly DateStr[],
): boolean {
  if (date === today) return false;
  if (date < today) return true;
  return date !== dates.find((d) => d > today);
}

/**
 * Ay haritasının haftalarını üç kümeye ayırır: geçmiş, görünen,
 * sonraki. Görünen = bugünün haftası + ondan sonraki İLK hafta;
 * geçmiş ve sonraki haftalar birer aç/kapa düğmesinin arkasında durur.
 *
 * Günlerle aynı kural, hafta ölçeğinde: tamamen ileride bir ayda ilk
 * hafta görünür, tamamen geçmiş bir ayda hiçbiri.
 */
export function splitWeeks(
  haftalar: readonly WeekSummary[],
  today: DateStr,
): {
  past: WeekSummary[];
  visible: WeekSummary[];
  later: WeekSummary[];
} {
  const past = haftalar.filter((h) => h.weekEnd < today);
  const current = haftalar.filter((h) => h.hasToday);
  const future = haftalar.filter((h) => h.weekStart > today);

  return {
    past,
    visible: [...current, ...future.slice(0, 1)],
    later: future.slice(1),
  };
}
