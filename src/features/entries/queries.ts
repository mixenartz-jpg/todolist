"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { DateStr } from "@/lib/date/types";
import type { EntryRow } from "@/lib/db/database.types";
import { buildEntryMap, type EntryMap } from "./entry-map";

/** Sorgu önbelleğinde tutulan sadeleştirilmiş satır. */
export interface CachedEntry {
  routine_id: string;
  date: string;
  value: number;
}

/**
 * Bir tarih aralığındaki tüm girdiler.
 *
 * `placeholderData: keepPreviousData` — ay değiştirilirken matris
 * iskelete düşmez, eski veri yerinde kalır ve yenisi gelince değişir.
 * Aksi halde her ay geçişinde grid çöker ve düzen sıçrar.
 */
export function useEntries(from: DateStr, to: DateStr) {
  return useQuery({
    queryKey: qk.entriesRange(from, to),
    queryFn: () => fetchEntries(from, to),
    placeholderData: keepPreviousData,
    // Map'i burada bir kez kur; her tüketici yeniden kurmasın.
    // TanStack Query `select`'i ham veri referansına göre memoize eder.
    select: buildEntryMap,
  });
}

async function fetchEntries(
  from: DateStr,
  to: DateStr,
): Promise<CachedEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("entries")
    .select("routine_id, date, value")
    .gte("date", from)
    .lte("date", to);

  if (error) throw error;

  // Postgres numeric → string. Önbelleğe girmeden önce çevrilir ki
  // optimistic yamalar ile sunucu verisi aynı tipte olsun.
  return (data as Pick<EntryRow, "routine_id" | "date" | "value">[]).map(
    (row) => ({
      routine_id: row.routine_id,
      date: row.date,
      value: Number(row.value),
    }),
  );
}

/** Boş harita — veri yüklenirken tüketicilerin kullanacağı sabit. */
export const EMPTY_ENTRIES: EntryMap = new Map();
