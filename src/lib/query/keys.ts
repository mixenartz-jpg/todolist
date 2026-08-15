import type { DateStr } from "@/lib/date/types";

/**
 * Sorgu anahtarları — tek kaynak.
 *
 * Hiyerarşi önemlidir: `entries()` öneki tüm aralık sorgularını kapsar,
 * böylece bir hücre değişikliği o tarihi içeren TÜM önbellek
 * aralıklarını tek seferde bulup yamalayabilir. Matris ayı, Bugün
 * günü ve İstatistik yılı çakışan aralıklardır; biri güncellenip
 * diğeri kalırsa ekranlar arası tutarsızlık oluşur.
 */
export const qk = {
  routines: () => ["routines"] as const,

  entries: () => ["entries"] as const,
  entriesRange: (from: DateStr, to: DateStr) =>
    ["entries", "range", from, to] as const,

  tasks: () => ["tasks"] as const,
  tasksDay: (date: DateStr) => ["tasks", "day", date] as const,

  notes: () => ["notes"] as const,
  note: (date: DateStr) => ["notes", date] as const,

  /*
   * Ayın hangi günlerinde PLAN yazılı? Ay ızgarasının hücre noktaları
   * için.
   *
   * `qk.notes()` önekinin ALTINDA — ve bu bilerek böyle: bir günün
   * planı kaydedilince `qk.note(date)` ile birlikte bunun da tazelenmesi
   * GEREKİR, yoksa hücredeki nokta gerçekle ayrışır. `mistakeImage`'ın
   * önekten kaçınma gerekçesinin TERSİ yön: orada önek eşleşmesi
   * gereksiz iş üretiyordu, burada tam olarak istenen işi ücretsiz
   * yapıyor.
   *
   * Üçüncü eleman "month" sabiti: `qk.note(date)` ikinci elemanda bir
   * tarih taşıyor ve ayrım olmasa `["notes", "2026-08"]` gibi bir
   * anahtar bir gün anahtarıyla karışabilirdi.
   */
  notePlansMonth: (month: DateStr) => ["notes", "month", month] as const,

  /*
   * Serbest defter. Anahtar "notes" DEĞİL "journal" — `qk.notes()`
   * zaten `qk.note(date)`'in önekidir ve TanStack Query önek eşleşmesi
   * yapar. Defteri de "notes" altına koysaydık, bir defter notunu
   * kaydetmek TÜM günlük notların önbelleğini geçersiz kılardı.
   */
  journal: () => ["journal"] as const,

  /*
   * Yanlışlar. Liste TEK sorgudur; çetele tablosu ve Bugün ekranının
   * tekrar kuyruğu istemcide bu listeden türetilir. Ayrı bir "tally"
   * ya da "due" anahtarı YOKTUR — olsaydı her yeni yanlış birden çok
   * anahtarı kilit adımda geçersiz kılmak zorunda kalır ve ikinci bir
   * doğruluk kaynağı doğardı.
   */
  mistakes: () => ["mistakes"] as const,

  /*
   * İmzalı görsel URL'i. "mistakes" ÖNEKİNİN ALTINDA DEĞİL: yeni bir
   * yanlış eklenince `qk.mistakes()` geçersiz kılınır ve önek eşleşmesi
   * yüzünden tüm imzalı URL'ler de çöpe giderdi — her satır için
   * gereksiz yeniden imzalama demek olurdu. İmza yalnızca süresi
   * dolunca yenilenmelidir.
   */
  mistakeImage: (path: string) => ["mistake-image", path] as const,

  /*
   * Bölüm başlıkları. TEK sorgudur ve tüm anahtarları kapsar: kullanıcı
   * başına bir avuç satır var ve anahtar başına ayrı sorgu, tek bir
   * ekranda dört ağ turu demek olurdu. Bir başlığı düzenlemek tümünü
   * tazeler — bu kadar küçük bir veri için ucuz ve tutarlı.
   */
  sectionLabels: () => ["section-labels"] as const,

  /*
   * Kategoriler. TEK sorgudur — kullanıcı başına bir avuç satır (renk
   * paleti sekiz, kategori sayısı o mertebede kalır) ve her ekran
   * hepsini birden ister: filtre çubuğu, görev satırındaki seçici, ay
   * dağılımı. Kategori başına ayrı anahtar, tek ekranda dört ağ turu
   * demek olurdu — `sectionLabels` ile aynı gerekçe.
   *
   * Arşivlenmişler de bu sorguda gelir: geçmiş görevlerin rengi ve adı
   * hâlâ çizilmeli, yalnızca SEÇİM listesinden çıkarılmalılar. Ayrı bir
   * "arşivli" anahtarı, aynı satırların iki önbellek girdisinde
   * durması olurdu.
   */
  categories: () => ["categories"] as const,

  /*
   * Aylık hedefler. AY BAŞINA ayrı anahtar: hedefler yıllar boyunca
   * birikir ama hep tek ay okunur — `tasks`'ın "hepsini çek, bellekte
   * filtrele" yaklaşımı burada tutmaz.
   *
   * Anahtar "plan-goals", düz "plan" DEĞİL. `["plan", "goals", month]`
   * yazılsaydı, ileride eklenecek herhangi bir `qk.plan(...)` anahtarı
   * önek eşleşmesiyle hedefleri de geçersiz kılardı. Tireli tek parça,
   * o çakışmayı yapısal olarak imkânsız kılar (`mistakeImage`'ın
   * "mistakes" önekinden kaçınmasıyla aynı gerekçe).
   */
  planGoals: () => ["plan-goals"] as const,
  planGoalsMonth: (month: DateStr) => ["plan-goals", month] as const,

  /*
   * Ayın genel planı — serbest metin (0009).
   *
   * Anahtar "month-plan": TİRELİ TEK PARÇA, tıpkı "plan-goals" gibi ve
   * tam olarak aynı gerekçeyle. `["plan", "month", ...]` yazılsaydı
   * ileride eklenecek herhangi bir `qk.plan(...)` anahtarı önek
   * eşleşmesiyle bunu da geçersiz kılardı.
   *
   * `qk.notes()` ALTINDA DEĞİL: ikisi ayrı tablo, ayrı yaşam döngüsü.
   * Bir gün notu kaydetmek ayın genel planını tazelemeyi gerektirmez
   * ve tersi de doğru — `notePlansMonth`'un öneke GİRME gerekçesinin
   * tersi yön: orada tazeleme gerçekten isteniyordu, burada boşuna iş
   * olurdu.
   *
   * Ay başına ayrı anahtar (`planGoalsMonth` ile aynı gerekçe):
   * planlar yıllar boyunca birikir ama ekran hep tek ay okur.
   */
  monthPlan: (month: DateStr) => ["month-plan", month] as const,
} as const;
