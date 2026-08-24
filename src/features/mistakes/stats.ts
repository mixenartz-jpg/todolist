/**
 * Yanlışlar çetelesi — mezuniyet ve aşama dağılımı.
 *
 * ── Neden bu ölçü? ──
 * Yanlışlar defterinin biriktirdiği asıl başarı, kaç yanlış
 * KAYDEDİLDİĞİ değil kaçının MEZUN olduğudur: dört tekrarı da geçmiş
 * bir yanlış, artık bilinen bir konudur. Bu sayı `review_stage`
 * içinde ilk günden beri duruyordu ama hiçbir ekran okumuyordu —
 * kullanıcı yüzlerce satır biriktirip ilerlemesini hiç görmüyordu.
 *
 * Uygulama yalnızca DÜRTEN bir kuyruk gösteriyordu (`ReviewQueue`) ve
 * dürtme motivasyon değildir; biten iş motivasyondur.
 *
 * ── Neden migration yok? ──
 * `reviewStage` her `useMistakes()` çağrısında zaten geliyor. Bu dosya
 * yalnızca sayıyor.
 */

import type { DateStr } from "@/lib/date/types";
import { GRADUATED_STAGE, isDue, toReviewState } from "./review";
import type { Mistake } from "./types";

export interface ReviewStats {
  total: number;
  /** Dört tekrarı da tamamlamış yanlışlar. */
  graduated: number;
  /** Hâlâ tekrar kuyruğunda olanlar. */
  inProgress: number;
  /** Vadesi gelmiş (geçmiş vadeler dahil) tekrarlar. */
  dueToday: number;
  /**
   * Aşama dağılımı: `byStage[n]` = tam n tekrarı tamamlamış yanlış
   * sayısı. Son kova (`GRADUATED_STAGE`) mezunlardır. Toplamı daima
   * `total`'a eşittir.
   */
  byStage: number[];
  /**
   * mezun / toplam.
   *
   * Hiç yanlış yoksa `null` — `0` DEĞİL. Sıfır göstermek "hiçbirini
   * bitiremedin" demek olurdu; oysa henüz ölçülecek bir şey yok.
   * (`goalProgress`'in `ratio: null` kararıyla aynı gerekçe.)
   */
  graduationRate: number | null;
}

export function reviewStats(
  mistakes: readonly Mistake[],
  today: DateStr,
): ReviewStats {
  const byStage = new Array<number>(GRADUATED_STAGE + 1).fill(0);

  let graduated = 0;
  let dueToday = 0;

  for (const m of mistakes) {
    /*
     * Kova indeksi SINIRLANIR: DB kısıtı `review_stage`'i 0-4 arasında
     * tutuyor ama bu dizi doğrudan indekslenecek ve tek bir bozuk
     * satırın `undefined++` ile bütün çeteleyi `NaN` yapması istenmez.
     */
    const stage = Math.min(Math.max(m.reviewStage, 0), GRADUATED_STAGE);
    byStage[stage] += 1;

    if (stage === GRADUATED_STAGE) {
      graduated += 1;
      continue;
    }

    // Mezunlar için sorulmaz: `isDue` zaten `false` döner ama niyet
    // burada okunsun.
    if (isDue(toReviewState(m), today)) dueToday += 1;
  }

  const total = mistakes.length;

  return {
    total,
    graduated,
    inProgress: total - graduated,
    dueToday,
    byStage,
    graduationRate: total > 0 ? graduated / total : null,
  };
}
