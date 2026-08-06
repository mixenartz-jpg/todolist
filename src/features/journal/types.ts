import type { DateStr } from "@/lib/date/types";

/**
 * Serbest defter notu.
 *
 * `DayNote` ile karıştırılmamalıdır: o gün başına tektir ve ruh hali
 * taşır; bu ise aynı güne birden çok kez yazılabilir.
 */
export interface Note {
  id: string;
  /** Boş bırakılabilir; liste gövdenin ilk satırını gösterir. */
  title: string | null;
  body: string;
  /** Notun ait olduğu gün — yazıldığı an değil. */
  date: DateStr;
  createdAt: string;
  updatedAt: string;
}

/** Yeni not ya da düzenleme için form verisi. */
export interface NoteDraft {
  title: string | null;
  body: string;
  date: DateStr;
}

export const NOTE_TITLE_MAX = 120;
export const NOTE_BODY_MAX = 10000;
