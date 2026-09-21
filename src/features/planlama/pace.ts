/**
 * Hedef temposu — "yolunda mıyım?" — saf mantık.
 *
 * ── `goalProgress` neden yetmiyor? ──
 * O "şu an neredeyim" diyor: %40. Ama %40 iyi mi kötü mü, ayın
 * kaçında olduğuna bağlı. Ayın 5'inde %40 harika, 25'inde geride.
 * Aynı sayı, iki zıt anlam — ve kullanıcı bu çeviriyi her seferinde
 * kafasından yapmak zorunda kalıyor. Koçun işi tam olarak bu çeviri.
 *
 * ── `goalProgress` DEĞİŞTİRİLMİYOR ──
 * `rollup.test.ts` onu 24 testle koruyor ve imzasını genişletmek o
 * testleri kırardı. `goalPace` onun ÇIKTISINI tüketiyor: iki hesap
 * ayrı sorular soruyor ve ayrı kalmalılar.
 *
 * ── Migration gerekmiyor ──
 * `PlanGoal`'da bitiş tarihi alanı yok, yalnızca `month`. Ama
 * beklenen oran mevcut veriden türetilebiliyor: dönemin ne kadarı
 * geçtiyse hedefin de o kadarı bitmiş olmalı.
 */

import { diffDays, endOfMonth, startOfMonth } from "@/lib/date/date";
import { periodLength } from "@/lib/date/period";
import type { DateStr } from "@/lib/date/types";
import type { GoalProgress } from "./rollup";

export type PaceVerdict = "ahead" | "onTrack" | "behind" | "noTarget";

export interface GoalPace {
  verdict: PaceVerdict;
  /** Bugün itibarıyla beklenen oran, 0-1. Dönemin ne kadarı geçti. */
  expected: number;
  /** Gerçekleşen oran, 0-1. `goalProgress`'ten. */
  actual: number;
  /**
   * Hedefe yetişmek için kalan günlerde GÜNDE gereken adet.
   *
   * `null` → sayısal hedef yok (ölçülemiyor) ya da hedef zaten
   * tamamlanmış (gereken bir şey kalmamış). İkisi de "bugün şu kadar
   * yap" demenin anlamsız olduğu durumlar.
   */
  perDayNeeded: number | null;
}

/**
 * Eşik: bu kadar sapma "yolunda" sayılır.
 *
 * 0.10 BİLEREK geniş. Dar bir eşik (%2) kullanıcıyı her gün
 * "geridesin" diye uyarırdı — hafta sonu çalışmayan biri her
 * Pazartesi geri düşer ve Salı toparlar. Koç günlük dalgalanmaya
 * değil, EĞİLİME bakmalı.
 */
const PACE_TOLERANCE = 0.1;

/**
 * Hedefin temposunu ölçer.
 *
 * `noTarget` → `goalProgress.ratio` null, yani ölçülecek bir şey yok
 * (ne sayısal hedef ne bağlı görev). `goalProgress`'in `none` modunu
 * aynalıyor ve arayüz bu durumda YORUM YAZMAMALI: ölçmediğimiz bir
 * şey hakkında "geridesin" demek uydurmaktır.
 */
export function goalPace(
  progress: GoalProgress,
  today: DateStr,
): GoalPace {
  if (progress.ratio === null) {
    return { verdict: "noTarget", expected: 0, actual: 0, perDayNeeded: null };
  }

  const month = startOfMonth(progress.goal.month);
  const expected = expectedRatio(month, today);
  const actual = progress.ratio;
  const diff = actual - expected;

  const verdict: PaceVerdict =
    diff > PACE_TOLERANCE
      ? "ahead"
      : diff < -PACE_TOLERANCE
        ? "behind"
        : "onTrack";

  return {
    verdict,
    expected,
    actual,
    perDayNeeded: perDayNeeded(progress, month, today),
  };
}

/**
 * Dönemin ne kadarı geçti, 0-1.
 *
 * Bugün AYIN İÇİNDE değilse iki uçtan birine kırpılıyor: geçmiş bir
 * ayın hedefi tamamen "beklenmiş" (1), gelecek bir ayınki hiç
 * beklenmemiş (0) sayılır. Kırpma olmasaydı Eylül'de Ağustos hedefine
 * bakmak "beklenen %120" gibi anlamsız bir sayı üretirdi.
 *
 * Bugün dahil sayılıyor: ayın 1'inde gün henüz bitmedi ama başladı ve
 * "beklenen %0" demek, ilk günü hiç yokmuş gibi saymak olurdu.
 */
function expectedRatio(month: DateStr, today: DateStr): number {
  const end = endOfMonth(month);

  if (today < month) return 0;
  if (today > end) return 1;

  const total = periodLength(month, "month");
  const elapsed = dayOfMonth(today);

  return Math.min(elapsed / total, 1);
}

/** Ayın kaçıncı günü (1 tabanlı). */
function dayOfMonth(date: DateStr): number {
  return Number(date.slice(8, 10));
}

/**
 * Kalan günlerde günde kaç adet gerekiyor?
 *
 * Yalnızca SAYISAL hedeflerde anlamlı: "30 deneme" hedefinde "günde
 * 4" somut bir talimat. Göreve bağlı ilerlemede karşılığı yok —
 * görevler adet değil, iş ve "günde 0.4 görev" bir cümle değil.
 *
 * Yukarı yuvarlanıyor: 3.2 gerektiğinde "günde 3" demek yetişmemek
 * demektir ve koç yetişmeyen bir plan öneremez.
 */
function perDayNeeded(
  progress: GoalProgress,
  month: DateStr,
  today: DateStr,
): number | null {
  const { goal } = progress;

  if (goal.targetCount === null) return null;

  const remaining = goal.targetCount - goal.doneCount;
  if (remaining <= 0) return null;

  const end = endOfMonth(month);
  if (today > end) return null;

  const total = periodLength(month, "month");
  /*
   * Kalan gün BUGÜNÜ DAHİL ediyor: bugün henüz bitmedi ve bugün de
   * çalışılabilir. Hariç tutulsaydı ayın son günü payda sıfır olur
   * ve sonsuz bir "gereken" üretirdi.
   */
  const daysLeft = Math.max(1, total - dayOfMonth(today) + 1);

  return Math.ceil(remaining / daysLeft);
}

/**
 * Hedefe kaç gündür hiç görev bağlanmadı?
 *
 * Koçun "Üçgenler hedefine 9 gündür hiç görev bağlamadın" cümlesi
 * buradan. `null` → hedefe hiç görev bağlanmamış (o zaman "kaç
 * gündür" sorusunun başlangıcı yok) ya da bugün bağlanmış.
 *
 * Ölçü `dueDate` üzerinden: bir görevin hedefe bağlandığı AN
 * saklanmıyor ve saklanması da gerekmiyor — asıl soru "bu hedef için
 * en son ne zaman çalışma planladım".
 */
export function daysSinceGoalTask(
  progress: GoalProgress,
  tasks: readonly { goalId: string | null; dueDate: DateStr | null }[],
  today: DateStr,
): number | null {
  let latest: DateStr | null = null;

  for (const task of tasks) {
    if (task.goalId !== progress.goal.id) continue;
    if (task.dueDate === null) continue;
    // Gelecek tarihli görev "boşluk" saymaz: plan zaten yapılmış.
    if (task.dueDate > today) return 0;
    if (latest === null || task.dueDate > latest) latest = task.dueDate;
  }

  if (latest === null) return null;

  // `diffDays(a, b)` = a - b; geçen gün sayısı pozitif olmalı.
  return diffDays(today, latest);
}
