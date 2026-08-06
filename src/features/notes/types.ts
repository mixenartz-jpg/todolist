import type { DateStr } from "@/lib/date/types";

/** Bir günün notu ve ruh hali. */
export interface DayNote {
  date: DateStr;
  note: string | null;
  /** 1 (çok kötü) … 5 (çok iyi). null → girilmemiş. */
  mood: Mood | null;
}

export type Mood = 1 | 2 | 3 | 4 | 5;

export const MOOD_LABELS: Record<Mood, string> = {
  1: "Çok kötü",
  2: "Kötü",
  3: "İdare eder",
  4: "İyi",
  5: "Çok iyi",
};
