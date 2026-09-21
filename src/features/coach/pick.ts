/**
 * Hangi koçluk cümlesi gösterilecek — saf mantık.
 *
 * ── Neden seçim gerekiyor? ──
 * Elde aynı anda dört-beş doğru cümle olabilir: seri, trend, gün
 * durumu, zayıf gün, hedef temposu. Hepsini birden göstermek panoyu
 * gürültüye çevirir ve koçluğu bir bildirim akışına dönüştürür. Bir
 * koç her şeyi aynı anda söylemez; o an EN ÇOK İŞE YARAYANI söyler.
 *
 * ── Öncelik neden bu sırada? ──
 * Bilgi değeri, ton hiyerarşisi değil. Sıralama:
 *
 *   1. warn + eylem  → kaybedilmek üzere olan bir şey var ve
 *                      önlenebilir. Zamana duyarlı tek sınıf bu.
 *   2. good + eylemsiz → kutlama. Eylemsiz olması kutlama olduğunun
 *                      işareti: yapılacak bir şey kalmamış.
 *   3. warn           → kötü haber, ama acil değil.
 *   4. good           → iyi haber.
 *   5. neutral        → durum bildirimi.
 *
 * Kutlamanın uyarıdan SONRA gelmesi bilinçli: serisi bugün kırılacak
 * birine önce "rekor kırdın" demek, sonra o rekoru kaybettirmektir.
 */

import type { CoachLine } from "./messages";

/** Öncelik sınıfı — küçük olan önce gösterilir. */
function rank(line: CoachLine): number {
  if (line.tone === "warn") return line.action === null ? 3 : 1;
  if (line.tone === "good") return line.action === null ? 2 : 4;
  return 5;
}

/**
 * Eldeki cümlelerden en bilgi değerlisini seçer.
 *
 * `null` girdiler ATLANIR, hata değildir: `trendLine` ve `weakDayLine`
 * ölçüm yetersizse bilerek `null` döner ve çağıranın her seferinde
 * filtrelemesi, bu sözleşmenin her çağrı yerinde yeniden
 * hatırlanmasını gerektirirdi.
 *
 * Hiç cümle yoksa `null` döner — uydurma bir dolgu cümlesi ("veri
 * toplanıyor") yazmak, boş bir yorumu koçluk diye sunmak olurdu.
 *
 * ── Eşitlikte ne olur? ──
 * Aynı sınıftan birden fazla cümle varsa DİZİ SIRASI kazanır. Çağıran
 * böylece bağlama göre kendi tercihini bildirebilir (panelde gün
 * durumu, geri bakışta trend önce gelsin gibi) ve karar, sıralamanın
 * gizli bir yan etkisi olmak yerine çağrı yerinde görünür olur.
 * `sort` yerine tek geçişli arama tam da bunun için: `Array.sort`
 * kararlıdır ama bu garantiye yaslanmak niyeti görünmez kılardı.
 */
export function pickCoachLine(
  lines: ReadonlyArray<CoachLine | null>,
): CoachLine | null {
  let best: CoachLine | null = null;
  let bestRank = Number.POSITIVE_INFINITY;

  for (const line of lines) {
    if (line === null) continue;

    const r = rank(line);
    if (r < bestRank) {
      best = line;
      bestRank = r;
    }
  }

  return best;
}
