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
  created_at: string;
}

export interface DayNoteRow {
  user_id: string;
  date: string;
  note: string | null;
  mood: number | null;
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
