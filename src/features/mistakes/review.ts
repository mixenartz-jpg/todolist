import { addDays, compareDates } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { Mistake } from "./types";

/**
 * Aralıklı tekrar merdiveni, gün cinsinden.
 *
 * `review_stage` TAMAMLANAN tekrar sayısıdır, "hangi aralık" değil.
 * Böylece sonraki vade `tekrarGünü + REVIEW_INTERVALS[stage]` şeklinde
 * temiz bir total fonksiyondur ve "mezun" sadece `stage === 4` demektir.
 */
export const REVIEW_INTERVALS = [1, 3, 7, 21] as const;

/** Bu aşamaya gelen yanlış bir daha tekrar kuyruğunda görünmez. */
export const GRADUATED_STAGE = REVIEW_INTERVALS.length;

export interface ReviewState {
  stage: number;
  /** null ⇔ stage === GRADUATED_STAGE */
  nextReviewDate: DateStr | null;
}

/** Yeni kaydedilen bir yanlışın ilk tekrar durumu: ertesi gün. */
export function initialReviewState(date: DateStr): ReviewState {
  return { stage: 0, nextReviewDate: addDays(date, REVIEW_INTERVALS[0]) };
}

/**
 * Tekrar tamamlandı → sonraki durum.
 *
 * ── Vade TEKRARIN YAPILDIĞI GÜNDEN hesaplanır ──
 * Orijinal tarihten değil. 1'inde kaydedip 20'sine kadar uygulamayı
 * açmayan biri birikmiş tekrarları yaptığında, hepsi anında yeniden
 * vadesi gelmiş olmamalıdır: stage 0 için sonraki vade 23'ü olmalı,
 * 4'ü değil.
 *
 * ── Mezuniyet ──
 * Son aralık (21 gün) işaretlenince yanlış mezun olur ve Bugün
 * ekranında bir daha görünmez. Sonsuza dek tekrar, iki ay içinde o
 * ekranı çöplüğe çevirirdi — aralıklı tekrar özelliklerini öldüren
 * başarısızlık modu budur. Mezun yanlışlar çetelede ve listede tam
 * görünür kalır; sadece dürtmeyi bırakırlar.
 *
 * Mezun durumdan ilerletmek idempotenttir: hata atmaz, 0'a sarmaz.
 */
export function advanceReview(
  state: ReviewState,
  reviewedOn: DateStr,
): ReviewState {
  if (isGraduated(state)) return state;

  const nextStage = state.stage + 1;
  if (nextStage >= GRADUATED_STAGE) {
    return { stage: GRADUATED_STAGE, nextReviewDate: null };
  }

  return {
    stage: nextStage,
    nextReviewDate: addDays(reviewedOn, REVIEW_INTERVALS[nextStage]),
  };
}

export function isGraduated(state: ReviewState): boolean {
  return state.nextReviewDate === null;
}

/**
 * Vadesi geldi mi?
 *
 * Geçmiş vadeler de dahildir: kaçırılan bir tekrar kaybolmamalı,
 * beklemeli.
 */
export function isDue(state: ReviewState, today: DateStr): boolean {
  if (state.nextReviewDate === null) return false;
  return compareDates(state.nextReviewDate, today) <= 0;
}

/**
 * Vadesi gelmiş yanlışlar, en eski vade önce.
 *
 * En çok bekleyen en üstte olmalı. Beraberlik `id` ile bozulur ki sıra
 * yeniden çizimlerde kararlı kalsın.
 */
export function dueMistakes(
  mistakes: readonly Mistake[],
  today: DateStr,
): Mistake[] {
  return mistakes
    .filter((m) => isDue(toReviewState(m), today))
    .sort((a, b) => {
      const cmp = compareDates(a.nextReviewDate!, b.nextReviewDate!);
      if (cmp !== 0) return cmp;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}

/** Yanlış satırından tekrar durumunu çıkarır. */
export function toReviewState(mistake: Mistake): ReviewState {
  return {
    stage: mistake.reviewStage,
    nextReviewDate: mistake.nextReviewDate,
  };
}
