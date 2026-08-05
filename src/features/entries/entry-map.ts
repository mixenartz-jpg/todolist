import type { DateStr } from "@/lib/date/types";

/**
 * Girdilerin bellek içi indeksi: `${routineId}:${date}` → value.
 *
 * Bir yılın tüm girdileri (~2.000-4.000 satır) tek bir Map'e sığar ve
 * her arama O(1)'dir. Bu yüzden istatistikler sunucuya gitmeden,
 * istemcide milisaniyeler içinde hesaplanabilir.
 *
 * Haritada bulunmayan anahtar 0 demektir — `value = 0` satırı asla
 * yazılmaz, işaret kaldırılınca satır silinir.
 */
export type EntryMap = ReadonlyMap<string, number>;

export function entryKey(routineId: string, date: DateStr): string {
  return `${routineId}:${date}`;
}

/** Sunucudan gelen satırlardan indeks kurar. */
export function buildEntryMap(
  rows: readonly { routine_id: string; date: string; value: number | string }[],
): EntryMap {
  const map = new Map<string, number>();
  for (const row of rows) {
    // Postgres `numeric` supabase-js'e STRING olarak gelir (hassasiyet
    // korunsun diye). Sınırda sayıya çevrilir; karşılaştırmaya
    // çevrilmemiş değer asla ulaşmaz.
    map.set(`${row.routine_id}:${row.date}`, Number(row.value));
  }
  return map;
}
