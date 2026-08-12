"use client";

import { useQuery } from "@tanstack/react-query";
import { asDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { DayNoteRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { DayNote, Mood } from "./types";

/** Tek bir günün notu. Kayıt yoksa boş bir not döner. */
export function useDayNote(date: DateStr) {
  return useQuery({
    queryKey: qk.note(date),
    queryFn: () => fetchDayNote(date),
  });
}

async function fetchDayNote(date: DateStr): Promise<DayNote> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("day_notes")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { date, note: null, mood: null, plan: null };

  return toDayNote(data as DayNoteRow);
}

export function toDayNote(row: DayNoteRow): DayNote {
  return {
    date: asDateStr(row.date),
    note: row.note,
    mood: (row.mood as Mood | null) ?? null,
    plan: row.plan,
  };
}
