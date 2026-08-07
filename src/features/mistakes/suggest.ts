import { normalize } from "@/lib/text/normalize";
import type { Mistake } from "./types";

/** Açılır listeyi taranabilir tutar; daha fazlası seçmek yerine okumak olur. */
export const MAX_SUGGESTIONS = 8;

/**
 * Ders adı önerileri.
 *
 * Serbest metin girişini tolere edilebilir kılan mekanizma budur:
 * kullanıcı ayrı bir "ders tanımla" ekranından geçmez, ama geçmişte
 * yazdıkları önerilir ve yazım tutarlı kalır.
 *
 * Tekilleştirme normalleştirilmiş biçime göredir (aynı dersin farklı
 * yazımı iki öneri olmamalı); gösterilen etiket EN SON kullanılan
 * yazımdır. Sıralama kullanım sıklığına göre azalandır — en çok yanlış
 * yapılan ders en üstte, çünkü bir sonraki kaydın da o olma olasılığı
 * en yüksektir.
 */
export function dersSuggestions(
  mistakes: readonly Mistake[],
  query: string,
): string[] {
  return rank(
    mistakes.map((m) => m.ders),
    query,
  );
}

/**
 * Konu önerileri.
 *
 * `ders` verilirse yalnızca O DERSİN konuları döner: "Türev" önerisini
 * Tarih dersini yazarken göstermek gürültüdür.
 *
 * Tanınmayan bir ders (henüz hiç yanlış girilmemiş) TÜM konuları
 * döndürür. Boş liste döndürmek, yepyeni bir ders yazan kullanıcıya ölü
 * bir açılır liste gösterirdi; tüm konular en azından yazım tutarlılığı
 * için tutamak sağlar.
 */
export function konuSuggestions(
  mistakes: readonly Mistake[],
  ders: string,
  query: string,
): string[] {
  const key = normalize(ders.trim());
  const scoped = key
    ? mistakes.filter((m) => normalize(m.ders.trim()) === key)
    : [];

  const pool = scoped.length > 0 ? scoped : mistakes;
  return rank(
    pool.map((m) => m.konu),
    query,
  );
}

/**
 * Değerleri sıklığa göre sıralar, normalleştirilmiş biçime göre
 * tekilleştirir ve sorguya göre süzer.
 *
 * Girdi yeniden eskiye sıralı geldiği için ilk görülen yazım en
 * yenisidir ve etiket olarak kalır.
 */
function rank(values: readonly string[], query: string): string[] {
  const term = normalize(query.trim());

  interface Acc {
    label: string;
    count: number;
  }
  const seen = new Map<string, Acc>();

  for (const raw of values) {
    const label = raw.trim();
    if (!label) continue;

    const key = normalize(label);
    const existing = seen.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      seen.set(key, { label, count: 1 });
    }
  }

  return [...seen.entries()]
    .filter(([key]) => (term ? key.includes(term) : true))
    .sort((a, b) => {
      if (a[1].count !== b[1].count) return b[1].count - a[1].count;
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    })
    .slice(0, MAX_SUGGESTIONS)
    .map(([, acc]) => acc.label);
}
