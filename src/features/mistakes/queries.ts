"use client";

import { useQuery } from "@tanstack/react-query";
import { asDateStr } from "@/lib/date/date";
import type { MistakeRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { Mistake } from "./types";

/** Boş dizi sabiti — her render'da yeni referans üretmemek için. */
export const EMPTY_MISTAKES: Mistake[] = [];

/**
 * Kullanıcının tüm yanlışları, tarihe göre yeniden eskiye.
 *
 * TEK sorgudur ve SAYFALANMAZ: çetele tablosu ile Bugün ekranının
 * tekrar kuyruğu bu listeden istemcide türetilir; sayfalama ikisini de
 * bozardı. Satır başına ~200 bayt, bir yıllık kullanımda birkaç yüz
 * kilobayt — kabul edilebilir. Görseller ayrıca ve tembel imzalanır.
 */
export function useMistakes() {
  return useQuery({ queryKey: qk.mistakes(), queryFn: fetchMistakes });
}

async function fetchMistakes(): Promise<Mistake[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mistakes")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as MistakeRow[]).map(toMistake);
}

export function toMistake(row: MistakeRow): Mistake {
  return {
    id: row.id,
    ders: row.ders,
    konu: row.konu,
    date: asDateStr(row.date),
    note: row.note,
    imagePath: row.image_path,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    reviewStage: row.review_stage,
    nextReviewDate: row.next_review_date
      ? asDateStr(row.next_review_date)
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** İmza ömrü. Sunucu tarafında geçerlilik süresi budur. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Görselin imzalı URL'i.
 *
 * Bucket özeldir; okuma ancak imzalı URL ile mümkündür. URL SATIRDA
 * SAKLANMAZ çünkü süresi dolar ve saklanan değer sessizce ölü bir
 * bağlantıya dönüşürdü.
 *
 * `staleTime` imza ömründen kısadır: liste uzun süre açık kalırsa URL
 * ölmeden önce yenilenir. `gcTime` de imza ömrünü aşmaz ki önbellekte
 * süresi dolmuş bir URL beklemesin.
 */
export function useMistakeImageUrl(path: string | null) {
  return useQuery({
    queryKey: qk.mistakeImage(path ?? ""),
    enabled: path !== null,
    staleTime: 50 * 60_000,
    gcTime: 55 * 60_000,
    queryFn: async (): Promise<string> => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("mistakes")
        .createSignedUrl(path!, SIGNED_URL_TTL_SECONDS);

      if (error) throw error;
      return data.signedUrl;
    },
  });
}
