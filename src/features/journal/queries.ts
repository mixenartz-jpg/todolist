"use client";

import { useQuery } from "@tanstack/react-query";
import { asDateStr } from "@/lib/date/date";
import type { NoteRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "./types";

/**
 * Tüm defter notları.
 *
 * Arama ve sıralama istemcide yapılır: not sayısı kişisel ölçekte
 * (yüzler mertebesi) kalır ve her tuş vuruşunda ağa gitmek yazarken
 * gecikme yaratırdı. Sunucu tarafı arama, hacim büyürse eklenecek
 * doğru adımdır; şimdi eklemek erken karmaşıklık olur.
 */
export function useNotes() {
  return useQuery({
    queryKey: qk.journal(),
    queryFn: fetchNotes,
  });
}

async function fetchNotes(): Promise<Note[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as NoteRow[]).map(toNote);
}

export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    date: asDateStr(row.date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
