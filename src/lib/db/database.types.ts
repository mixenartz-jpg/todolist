/**
 * Veritabanı satır tipleri.
 *
 * `supabase gen types` ile üretilebilir; şu an elle tutuluyor çünkü
 * şema küçük ve migration'larla birebir eşleşiyor.
 *
 * DİKKAT: Postgres `numeric` sütunları supabase-js'e STRING olarak
 * gelir (hassasiyet korunsun diye). `target` ve `value` bu yüzden
 * `number | string` tipindedir ve sınırda `Number()` ile çevrilir.
 */

export interface RoutineRow {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color_slot: number;
  target: number | string;
  unit: string | null;
  start_date: string;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
}

export interface RoutineScheduleRow {
  routine_id: string;
  user_id: string;
  effective_from: string;
  schedule: unknown;
  created_at: string;
}

export interface EntryRow {
  id: string;
  user_id: string;
  routine_id: string;
  date: string;
  value: number | string;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  done: boolean;
  note: string | null;
  sort_order: number;
  /** Postgres `time` supabase-js'e 'HH:MM:SS' STRING olarak gelir. */
  start_time: string | null;
  duration_minutes: number | null;
  /** Kategori FK. En fazla BİR tane — çoklu etiket değil (0008). */
  category_id: string | null;
  /** Aylık hedef FK. En fazla BİR tane. */
  goal_id: string | null;
  created_at: string;
}

/**
 * Kategori satırı.
 *
 * `color_slot` `smallint`'tir ve supabase-js'e number olarak gelir;
 * yukarıdaki `numeric` uyarısı burada geçerli değildir.
 */
export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  color_slot: number;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Aylık hedef satırı.
 *
 * `month` Postgres `date`'tir; supabase-js 'YYYY-MM-DD' STRING
 * döndürür, yani `asDateStr()` doğrudan geçer ve
 * src/lib/date/types.ts'in "sınırdan Date nesnesi geçmez" kuralı
 * korunur. Değer her zaman ayın 1'idir (DB kısıtı).
 *
 * `target_count` null ise ilerleme bağlı görevlerden okunur;
 * `done_count` yalnızca `target_count` doluyken anlamlıdır.
 */
export interface PlanGoalRow {
  id: string;
  user_id: string;
  month: string;
  title: string;
  note: string | null;
  target_count: number | null;
  done_count: number;
  color_slot: number;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Haftalık hedef — hedef başına bir satır (0011).
 *
 * `PlanGoalRow`'un hafta ölçeğindeki eşi. İki fark:
 *
 *   week_start   : ayın 1'i yerine ISO PAZARTESİSİ ('YYYY-MM-DD')
 *   completed_at : `archived_at` yerine. Arşiv vazgeçmedir,
 *                  tamamlanma başarıdır; haftalık hedefte istenen
 *                  ikincisi ve tamamlanan hedef listede KALIR.
 *
 * Haftalık hedefe görev bağlanmaz (`tasks.goal_id` yalnızca
 * `plan_goals`'a bakar), bu yüzden `target_count` null olduğunda
 * ilerleme hiçbir yerden türetilmez — sadece sayaçsız hedef demektir.
 */
export interface WeekGoalRow {
  id: string;
  user_id: string;
  week_start: string;
  title: string;
  note: string | null;
  target_count: number | null;
  done_count: number;
  color_slot: number;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayNoteRow {
  user_id: string;
  date: string;
  note: string | null;
  mood: number | null;
  /**
   * Günün İLERİYE dönük planı — `note` ile aynı şey DEĞİLDİR.
   *
   * `note` geriye dönüktür ("bugün nasıl geçti", Bugün ekranı, ruh
   * haliyle birlikte); `plan` ileriye dönüktür ("bugün şunları
   * yapacağım", Planlama ekranı). İkisi aynı satırda yaşar ama farklı
   * ekranlardan, farklı mutation'larla ve KESİŞMEYEN sütun kümeleriyle
   * yazılır (0008).
   */
  plan: string | null;
  updated_at: string;
}

/**
 * Serbest defter satırı. `DayNoteRow` ile aynı şey DEĞİLDİR:
 * `day_notes` gün başına tek kayıt tutar (ruh hali + gün
 * değerlendirmesi), `notes` ise aynı güne birden çok not alır.
 */
export interface NoteRow {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Bölüm başlığı satırı.
 *
 * Yalnızca kullanıcının varsayılandan SAPAN başlıkları için satır
 * bulunur; yazılmamış anahtar koddaki varsayılana düşer (bkz.
 * src/lib/ui/sections.ts). Bu yüzden tabloyu okuyan taraf eksik
 * anahtarı hata değil, "değiştirilmemiş" olarak yorumlar.
 */
export interface SectionLabelRow {
  user_id: string;
  key: string;
  label: string;
  updated_at: string;
}

/**
 * Yanlış satırı.
 *
 * Bu tabloda `numeric` sütun YOKTUR; yukarıdaki string-coercion uyarısı
 * burada geçerli değildir. `smallint` supabase-js'e number olarak gelir.
 *
 * `review_stage` tamamlanan tekrar sayısıdır (0..4), "hangi aralık"
 * değil. `next_review_date` null ise yanlış mezun olmuştur ve bir daha
 * tekrar kuyruğunda görünmez.
 */
export interface MistakeRow {
  id: string;
  user_id: string;
  ders: string;
  konu: string;
  date: string;
  note: string | null;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  review_stage: number;
  next_review_date: string | null;
  created_at: string;
  updated_at: string;
}
