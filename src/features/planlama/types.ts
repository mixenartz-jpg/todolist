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
 * Bir haftanın hedef kalemi.
 *
 * `PlanGoal`'un hafta ölçeğindeki eşi; iki yerde ayrışır:
 *
 *   weekStart   : ay çapası yerine ISO pazartesisi.
 *   completedAt : `archivedAt` yerine. Arşiv "artık takip etmiyorum"
 *                 (vazgeçme), tamamlanma "bitirdim" (başarı). Haftalık
 *                 hedefte istenen ikincisidir ve tamamlanan hedef
 *                 listeden KALKMAZ, üstü çizili durur — kullanıcı hafta
 *                 sonunda neyi bitirdiğini görmek istiyor.
 *
 * `targetCount` null olduğunda ilerleme HİÇBİR yerden türetilmez:
 * `PlanGoal`'ün aksine haftalık hedefe görev bağlanmaz. O durumda hedef
 * sayaçsızdır ve yalnızca elle tamamlanır.
 */
export interface WeekGoal {
  id: string;
  /** ISO haftasının pazartesisi — `startOfIsoWeek()` ile üretilir. */
  weekStart: DateStr;
  title: string;
  note: string | null;
  /** Sayısal hedef ("3 bölüm"); null → sayaçsız hedef. */
  targetCount: number | null;
  /** Elle işaretlenen ilerleme; yalnızca `targetCount` doluyken anlamlı. */
  doneCount: number;
  colorSlot: number;
  sortOrder: number;
  /** null → sürüyor. Dolu → tamamlandı; listede kalır, üstü çizilir. */
  completedAt: string | null;
  /**
   * Hizmet ettiği aylık hedef; null → bağımsız hafta hedefi.
   *
   * Yalnızca GRUPLAR: aylık hedefin ilerlemesi bundan türemez
   * (`goalProgress` yine kendi sayacına ya da bağlı görevlere bakar).
   * Görevin haftalık hedefe bağlanmamasının gerekçesi 0014'te.
   */
  planGoalId: string | null;
}

export interface WeekGoalDraft {
  weekStart: DateStr;
  title: string;
  note: string | null;
  targetCount: number | null;
  colorSlot: number;
  /** Sona eklemek için: o haftadaki mevcut hedef sayısı. */
  sortOrder: number;
  /** Hizmet ettiği aylık hedef; null → bağımsız. */
  planGoalId: string | null;
}

/**
 * Hedef ağacının bir düğümü (0022).
 *
 * `PlanGoal` ile `Task` ARASINDAKİ katman: hedef "Kimya'yı
 * bitireceğim" der, görev "12 Ekim'de 25 soru çöz" der, düğüm ise
 * ikisini bağlayan planı taşır ("Asitler-Bazlar" → "Soru bankası 50
 * soru").
 *
 * ── Neden `WeekGoal` gibi bir hedef değil? ──
 * Düğümün kendi sayacı, kendi tamamlanma damgası, kendi ayı YOK ve
 * bilerek yok. İlerlemesi bağlı görevlerinden ve çocuklarından
 * TÜRETİLİR (bkz. nodeprogress.ts). İkinci bir elle işaretlenen sayaç
 * eklemek, aynı gerçeğin iki kaynağı demekti — 0014'ün çift sayım
 * gerekçesinin aynısı.
 */
export interface GoalNode {
  id: string;
  /** Ağacın ait olduğu aylık hedef. Her düğümde dolu (kök olmayanda da). */
  planGoalId: string;
  /** Üst düğüm; null → hedefin doğrudan çocuğu. */
  parentId: string | null;
  /**
   * Ağaçtaki seviye, 1..3.
   *
   * SUNUCU TÜRETİR — istemci hesaplamaz, göndermez. `aria-level` bunu
   * doğrudan okur; ağacı yürümek gerekmez.
   */
  depth: number;
  /** Serbest metin. Tür/enum alanı YOK (gerekçe 0022). */
  title: string;
  note: string | null;
  sortOrder: number;
}

export interface GoalNodeDraft {
  planGoalId: string;
  /** null → hedefin doğrudan çocuğu (depth 1). */
  parentId: string | null;
  title: string;
  note: string | null;
  /** Sona eklemek için: aynı ebeveyn altındaki mevcut kardeş sayısı. */
  sortOrder: number;
  /*
   * `depth` BİLEREK YOK: sunucudaki trigger ebeveynden türetir.
   * İstemcinin göndereceği bir derinlik, ebeveyni görmediği için
   * yanlış olabilir ve check kısıtı onu ancak 3'ü aştığında yakalardı.
   */
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
