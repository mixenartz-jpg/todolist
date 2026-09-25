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
  /**
   * Tamamlanma anı, ISO damga. null → hiç tamamlanmadı YA DA 0017
   * öncesinde tamamlandı (arşiv o zaman `due_date`'e düşer).
   */
  completed_at: string | null;
  /** Kategori FK. En fazla BİR tane — çoklu etiket değil (0008). */
  category_id: string | null;
  /** Aylık hedef FK. En fazla BİR tane. */
  goal_id: string | null;
  /**
   * Görevin doğduğu plan düğümü (0022). null → düğümsüz görev; bu
   * NORMAL durumdur, görevlerin çoğu bir ağaçtan gelmez.
   *
   * `goal_id` ile birlikte taşınır, onun yerine değil: düğümden doğan
   * görev ikisini de doldurur. Böylece GoalCard'ın mevcut çubuğu
   * (goalProgress → goal_id) değişmeden çalışır, ağaç sayfası ise
   * aynı görevleri daha ince okur. İki sayaç değil, iki çözünürlük.
   */
  node_id: string | null;
  /**
   * Görevin KENDİ renk slotu (0..7). null → kategori renginden
   * devralınır (0013). `smallint`, supabase-js'e number gelir.
   */
  color_slot: number | null;
  /**
   * Tahmini süre, dakika (0023). null → tahmin yok.
   *
   * Opsiyonel (`?`), çünkü migration ELLE çalıştırılıyor (README):
   * kod ondan önce yayına çıkarsa `select("*")` bu alanı hiç
   * döndürmez ve tip bunu söylemek zorunda — `toTask` `?? null` ile
   * düşürür.
   */
  estimate_minutes?: number | null;
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
  /**
   * Hizmet ettiği AYLIK hedef (0014). null → bağımsız hafta hedefi.
   *
   * Bir GRUPLAMADIR, ikinci bir sayaç değil: `tasks.goal_id` yalnızca
   * `plan_goals`'a bakmaya devam eder ve çift sayım imkânsız kalır.
   * Gerekçe migration 0014'te.
   */
  plan_goal_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hedef ağacının düğümü (0022).
 *
 * `plan_goals`'ın altındaki plan katmanı: konu → alt konu → iş.
 * Düğümler günlere GÖREV olarak dağıtılır (`tasks.node_id`).
 *
 * `depth` SUNUCU TÜRETİR (stamp_goal_node_depth trigger'ı); istemci
 * asla göndermez ve bu yüzden `GoalNodeDraft`'ta yoktur.
 *
 * `plan_goal_id` her satırda dolu, yalnızca köklerde değil: tüm ağaç
 * tek sorguda çekilebilsin diye. Trigger ebeveynle aynı olmasını
 * garanti ettiği için kopya ayrışamaz (gerekçe 0022).
 */
export interface GoalNodeRow {
  id: string;
  user_id: string;
  plan_goal_id: string;
  /** null → hedefin doğrudan çocuğu (depth 1). */
  parent_id: string | null;
  /** 1..3. `smallint`, supabase-js'e number gelir. */
  depth: number;
  title: string;
  note: string | null;
  sort_order: number;
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
 * Deneme oturumu (0018).
 *
 * NET SÜTUNU YOKTUR ve olmamalıdır: net `dogru - yanlis / 4` ile
 * ders satırlarından türetilir (bkz. features/deneme/net.ts).
 * Saklansaydı `dogru` güncellenip net güncellenmediğinde yalan
 * söyleyebilen ikinci bir gerçek kaynağı olurdu.
 */
export interface DenemeRow {
  id: string;
  user_id: string;
  ad: string;
  /** tyt | ayt | brans | ydt. brans trendde AYRI çizilir. */
  tur: string;
  /** say | ea | soz | dil. Yalnız `tur === "ayt"` iken dolu. */
  alan: string | null;
  /** Denemenin ÇÖZÜLDÜĞÜ gün; kaydedildiği an değil. */
  tarih: string;
  sure_dk: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Denemenin ders kırılımı (0018).
 *
 * DİKKAT: `hedef_net` bir `numeric` sütundur ve dosyanın başındaki
 * uyarı BURADA GEÇERLİDİR — supabase-js onu STRING olarak getirir ve
 * sınırda `Number()` ile açılmalıdır. Diğer sayılar `smallint`,
 * onlar number gelir.
 *
 * Değişmez: `dogru + yanlis + bos === soru_sayisi` (veritabanı kısıtı).
 */
export interface DenemeDersRow {
  id: string;
  user_id: string;
  deneme_id: string;
  ders: string;
  dogru: number;
  yanlis: number;
  bos: number;
  soru_sayisi: number;
  /** `numeric` → STRING gelir. */
  hedef_net: number | string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Bir denemede yapılan yanlış (0019).
 *
 * 0005'teki `mistakes` tablosunun halefi ama artık DENEMENİN ÇOCUĞU:
 * `deneme_id` zorunlu, böylece deneme detayı kendi yanlışlarını tek
 * sorguyla getirir.
 *
 * `konu` ve `hata_turu` null olabilir ve bu MEŞRU bir durumdur:
 * etiketleme ayrı bir oturumun işi ("bu soruyu şimdi çözebiliyor
 * muyum?"). Kayıt anında zorunlu kılmak uydurma veri üretirdi.
 *
 * `review_stage` tamamlanan tekrar sayısıdır (0..4), "hangi aralık"
 * değil. `next_review_date` null ise yanlış mezun olmuştur ve bir daha
 * tekrar kuyruğunda görünmez.
 */
export interface DenemeYanlisRow {
  id: string;
  user_id: string;
  deneme_id: string;
  ders: string;
  konu: string | null;
  soru_no: number | null;
  /** bilgi | islem | dikkat | sure | strateji. null = etiketlenmedi. */
  hata_turu: string | null;
  note: string | null;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  review_stage: number;
  next_review_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Tarihsiz alınacak kalemi (0015).
 *
 * `TaskRow` ile aynı şey DEĞİLDİR ve ayrı tablo oluşu bilerek: bu
 * satırın saati, süresi, kategorisi, hedefi ve TARİHİ yoktur. Görev
 * tablosuna bir `kind` sütunuyla sığdırılsaydı, tasks'a dokunan her
 * sorgu (gün ızgarası, hafta planı, havuz, gecikenler, istatistik) bir
 * filtre borcu üstlenirdi ve unutulan filtre sessizce yanlış liste
 * gösterirdi. Gerekçenin tamamı migration 0015'te.
 *
 * `completed_at`, `WeekGoalRow`'daki ile aynı anlamı taşır: arşiv
 * değil bitirme. İşaretlenen kalem listede KALIR, yalnızca üstü
 * çizilir.
 */
export interface ShoppingItemRow {
  id: string;
  user_id: string;
  title: string;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Odak oturumu satırı (0021).
 *
 * `task_id` null olabilir (görev silinmiş) ama `task_title` ASLA:
 * geçmiş, görevin hâlâ var olmasına bağlı olmadan okunabilir kalmalı.
 * Bu, `ShoppingItemRow`'un ayrı tablo oluşuyla aynı disiplin —
 * bağımlılığı yapısal olarak kesmek.
 *
 * `net_seconds`, `ended_at - started_at` DEĞİLDİR: duraklamalar
 * düşülmüş süredir. Farkı türetmek, Zen'in kaydetmeme gerekçesindeki
 * yalanı geri getirirdi.
 */
export interface FocusSessionRow {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title: string;
  mode: "free" | "pomodoro";
  started_at: string;
  ended_at: string;
  net_seconds: number;
  created_at: string;
}
