import type { DateStr } from "@/lib/date/types";

/**
 * Kullanıcının kendi oluşturduğu görev kategorisi.
 *
 * Rutinlerin `colorSlot`'uyla AYNI paleti kullanır (src/lib/ui/colors.ts):
 * kullanıcı için "renk = kimlik" dili tek kalsın diye. Serbest hex
 * olmamasının gerekçesi migration 0008'de.
 */
export interface Category {
  id: string;
  name: string;
  /** 0..7 — src/lib/ui/colors.ts paleti. */
  colorSlot: number;
  sortOrder: number;
  /** null → etkin. Dolu → arşivlenmiş; seçim listesinde görünmez. */
  archivedAt: string | null;
}

export interface CategoryDraft {
  name: string;
  colorSlot: number;
  /** Sona eklemek için: mevcut kategori sayısı. */
  sortOrder: number;
}

/** Bir ayın hedef/odak kalemi. */
export interface PlanGoal {
  id: string;
  /** Ayın 1'i — `startOfMonth()` ile üretilir. */
  month: DateStr;
  title: string;
  note: string | null;
  /**
   * Sayısal hedef ("30 deneme").
   *
   * null → ilerleme BAĞLI GÖREVLERDEN okunur. Bu iki ölçüm biçimi
   * bilerek ayrıdır: her hedef göreve bağlanmaz ("kitabı bitir — 12
   * bölüm" için on iki görev açmak kullanıcıya yüklenen gereksiz iştir).
   */
  targetCount: number | null;
  /** Elle işaretlenen ilerleme; yalnızca `targetCount` doluyken anlamlı. */
  doneCount: number;
  colorSlot: number;
  sortOrder: number;
  archivedAt: string | null;
}

export interface PlanGoalDraft {
  month: DateStr;
  title: string;
  note: string | null;
  targetCount: number | null;
  colorSlot: number;
  /** Sona eklemek için: o aydaki mevcut hedef sayısı. */
  sortOrder: number;
}

/**
 * Kategori filtresi.
 *
 *   null    → filtre yok, hepsi görünür
 *   "none"  → YALNIZCA kategorisi olmayanlar
 *   string  → o kategori kimliği
 *
 * `"none"` sentinel'i şart: "filtre yok" ile "etiketlemediklerimi
 * göster" farklı isteklerdir ve kullanıcı ikincisini ister ("hangi
 * işleri sınıflandırmayı unuttum?"). İkisini tek `null` ile ifade etmek
 * imkânsızdır.
 */
export type CategoryFilter = string | null | "none";
