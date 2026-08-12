import type { DateStr } from "@/lib/date/types";

/** Bir günün notu, ruh hali ve planı. */
export interface DayNote {
  date: DateStr;
  /**
   * Günün GERİYE dönük değerlendirmesi — "bugün nasıl geçti".
   * Bugün ekranında, ruh haliyle birlikte yazılır.
   */
  note: string | null;
  /** 1 (çok kötü) … 5 (çok iyi). null → girilmemiş. */
  mood: Mood | null;
  /**
   * Günün İLERİYE dönük planı — "bugün şunları yapacağım".
   * Planlama ekranında yazılır.
   *
   * `note` ile aynı satırda yaşar ama AYNI ŞEY DEĞİLDİR ve onun yerine
   * geçmez: ikisini tek alanda tutmak, akşam yazılan değerlendirmenin
   * sabahki planı ezmesi demekti (gerekçe: migration 0008).
   */
  plan: string | null;
}

export type Mood = 1 | 2 | 3 | 4 | 5;

export const MOOD_LABELS: Record<Mood, string> = {
  1: "Çok kötü",
  2: "Kötü",
  3: "İdare eder",
  4: "İyi",
  5: "Çok iyi",
};
