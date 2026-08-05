import type { DateStr } from "@/lib/date/types";

/**
 * Sorgu anahtarları — tek kaynak.
 *
 * Hiyerarşi önemlidir: `entries()` öneki tüm aralık sorgularını kapsar,
 * böylece bir hücre değişikliği o tarihi içeren TÜM önbellek
 * aralıklarını tek seferde bulup yamalayabilir. Matris ayı, Bugün
 * günü ve İstatistik yılı çakışan aralıklardır; biri güncellenip
 * diğeri kalırsa ekranlar arası tutarsızlık oluşur.
 */
export const qk = {
  routines: () => ["routines"] as const,

  entries: () => ["entries"] as const,
  entriesRange: (from: DateStr, to: DateStr) =>
    ["entries", "range", from, to] as const,

  tasks: () => ["tasks"] as const,
  tasksDay: (date: DateStr) => ["tasks", "day", date] as const,

  notes: () => ["notes"] as const,
  note: (date: DateStr) => ["notes", date] as const,
} as const;
