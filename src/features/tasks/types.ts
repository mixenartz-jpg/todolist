import type { DateStr } from "@/lib/date/types";

/**
 * Tek seferlik görev.
 *
 * Rutinlerden ayrıdır ve rutin istatistiklerine KARIŞMAZ: "Cuma
 * faturayı öde" tamamlanmadığında bir alışkanlık serisi kırılmamalı.
 * Bugün ekranında rutinlerle yan yana görünür ama ayrı bir bölümde.
 */
export interface Task {
  id: string;
  title: string;
  /** null → tarihsiz; bir gün yapılacak ama ne zaman belli değil. */
  dueDate: DateStr | null;
  done: boolean;
  note: string | null;
  sortOrder: number;
  /**
   * Başlangıç saati, 'HH:MM' (saniye sınırda kırpılır).
   *
   * null → saatsiz görev. Bu BİRİNCİ SINIF bir durumdur: işlerin çoğu
   * belirli bir saate bağlı değildir ve saatsiz görevler düz listede
   * kalır. Gün planı yalnızca saati olanlardan kurulur.
   */
  startTime: string | null;
  /** Süre, dakika. `startTime` null ise her zaman null. */
  durationMinutes: number | null;
  /**
   * Kategori kimliği. En fazla BİR tane — çoklu etiket değil.
   *
   * null → kategorisiz ve bu birinci sınıf bir durumdur: görevlerin
   * çoğu sınıflandırılmaz. Ay dağılımında kategorisizler kendi
   * kovasında görünür.
   *
   * Tek kategori kısıtının gerekçesi şemada (0008): bir görev iki
   * dilime birden sayılsaydı dilimlerin toplamı görev sayısını aşar ve
   * grafik yalan söylerdi.
   */
  categoryId: string | null;
  /** Bağlı olduğu aylık hedef. En fazla BİR tane; null → bağsız. */
  goalId: string | null;
}

export interface TaskDraft {
  title: string;
  dueDate: DateStr | null;
  note: string | null;
}
