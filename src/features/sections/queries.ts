"use client";

import { useQuery } from "@tanstack/react-query";
import type { SectionLabelRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import { resolveLabel, type SectionKey } from "@/lib/ui/sections";

/**
 * Kararlı boş harita.
 *
 * `?? new Map()` yazmak her render'da yeni bir referans üretir ve onu
 * bağımlılık dizisine koyan her `useMemo`'yu boşa çıkarır
 * (`EMPTY_ENTRIES` ile aynı gerekçe).
 */
export const EMPTY_LABELS: ReadonlyMap<string, string> = new Map();

/**
 * Kullanıcının özel bölüm adları — anahtar → etiket.
 *
 * Yalnızca DEĞİŞTİRİLMİŞ başlıklar için satır döner; yazılmamış anahtar
 * koddaki varsayılana düşer (bkz. src/lib/ui/sections.ts). Bu yüzden
 * boş bir sonuç hata değil, "hiçbir şey yeniden adlandırılmamış"
 * demektir.
 *
 * `staleTime` uzundur: etiketler neredeyse hiç değişmez ve değiştiği an
 * mutation önbelleği zaten yamalıyor. Görevler gibi 30 saniyede bir
 * tazelemek, hiç değişmeyen bir veri için boş ağ turu olurdu.
 */
export function useSectionLabels() {
  return useQuery({
    queryKey: qk.sectionLabels(),
    queryFn: fetchSectionLabels,
    staleTime: 5 * 60_000,
  });
}

async function fetchSectionLabels(): Promise<ReadonlyMap<string, string>> {
  const supabase = createClient();

  const { data, error } = await supabase.from("section_labels").select("key,label");

  if (error) throw error;

  return new Map((data as Pick<SectionLabelRow, "key" | "label">[]).map((r) => [r.key, r.label]));
}

/**
 * Tek bir bölümün gösterilecek adı.
 *
 * Sorgu beklerken ya da hata verdiğinde VARSAYILANI döndürür, boş
 * string değil: başlık yükleme sırasında kaybolup sonra belirirse
 * sayfa zıplar, üstelik varsayılan zaten doğru cevabın kendisidir.
 * Etiketler bir ağ hatası yüzünden ekranı bozmayacak kadar ikincildir.
 */
export function useSectionLabel(key: SectionKey): string {
  const { data } = useSectionLabels();
  return resolveLabel(data ?? EMPTY_LABELS, key);
}
