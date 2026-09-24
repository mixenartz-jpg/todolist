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
   * GEREKİR, yoksa hücredeki nokta gerçekle ayrışır. `planGoals`'ın
   * önekten kaçınma gerekçesinin TERSİ yön: orada önek eşleşmesi
   * gereksiz iş üretirdi, burada tam olarak istenen işi ücretsiz
   * yapıyor.
   *
   * Üçüncü eleman "month" sabiti: `qk.note(date)` ikinci elemanda bir
   * tarih taşıyor ve ayrım olmasa `["notes", "2026-08"]` gibi bir
   * anahtar bir gün anahtarıyla karışabilirdi.
   */
  notePlansMonth: (month: DateStr) => ["notes", "month", month] as const,

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
   * o çakışmayı yapısal olarak imkânsız kılar: önek eşleşmesi ancak
   * İSTENDİĞİ yerde kurulur (bkz. `notePlansMonth`, ters yön).
   */
  planGoals: () => ["plan-goals"] as const,
  planGoalsMonth: (month: DateStr) => ["plan-goals", month] as const,

  /*
   * Hedef ağacının düğümleri (0022).
   *
   * Anahtar "goal-nodes": TİRELİ TEK PARÇA, `plan-goals` ve
   * `week-goals` ile aynı gerekçe — ileride eklenecek bir
   * `qk.goal(...)` anahtarının önek eşleşmesiyle bunu da geçersiz
   * kılması yapısal olarak imkânsız kalsın.
   *
   * `planGoals` ÖNEKİNİN ALTINDA DEĞİL ve bu kritik: bir düğümü
   * yeniden adlandırmak hedefin KENDİ satırını (başlık, sayaç, renk,
   * sıra) değiştirmez. Ortak önek, her düğüm düzenlemesinde o ayın
   * tüm hedef listesinin yeniden çekilmesi demekti —
   * `planGoals`'ın önekten kaçınma gerekçesinin aynısı, bir seviye
   * derinde.
   *
   * HEDEF BAŞINA ayrı alt anahtar: ağaç tek sorguda, tek hedef için
   * çekiliyor (0022'nin plan_goal_id denormalizasyonunun sebebi) ve
   * ekran hep tek hedefin ağacına bakıyor — `planGoalsMonth`'un
   * bölünme gerekçesiyle aynı.
   *
   * ── Görev anahtarıyla ilişkisi ──
   * Düğümü güne DAĞITMAK yalnızca `qk.tasks()`'i tazeler, bunu değil:
   * dağıtım düğüm satırlarını değiştirmiyor, yalnızca yeni görevler
   * doğuruyor ve ağacın ilerlemesi zaten istemcide `useTasks()`'tan
   * türetiliyor (nodeprogress.ts). Düğüm SİLMEK ise ikisini birden
   * tazeler — sunucu `on delete set null` ile görevlerin `node_id`'sini
   * boşaltıyor.
   */
  goalNodes: () => ["goal-nodes"] as const,
  goalNodesFor: (planGoalId: string) => ["goal-nodes", planGoalId] as const,
  /*
   * Birden çok hedefin ağaçları TEK sorguda — Hedefler ekranı her
   * kartın yüzdesini ağaçtan okumak zorunda ve kart başına sorgu, on
   * hedefli bir ayda on ağ turu demekti.
   *
   * Kimlikler anahtarın parçası ve SIRALI verilmeli (çağıran
   * sıralıyor): aynı hedef kümesi farklı sırada gelirse ikinci bir
   * önbellek girdisi doğardı.
   *
   * Üçüncü eleman "many" sabiti: `["goal-nodes", <tek id>]` ile
   * karışmasın. Tek hedefin ağacı ayrı bir anahtarda yaşıyor ve
   * ikisinin aynı satırları iki yerde tutması, birini tazeleyip
   * diğerini bayat bırakma riski taşıyor — bu yüzden ayrımı
   * yapısal tutuyoruz.
   */
  goalNodesMany: (planGoalIds: readonly string[]) =>
    ["goal-nodes", "many", planGoalIds.join(",")] as const,

  /*
   * Haftalık hedefler (0011).
   *
   * Anahtar "week-goals": TİRELİ TEK PARÇA, tıpkı "plan-goals" gibi ve
   * tam olarak aynı gerekçeyle. `["plan", "week", ...]` yazılsaydı
   * ileride eklenecek herhangi bir `qk.plan(...)` anahtarı önek
   * eşleşmesiyle bunu da geçersiz kılardı.
   *
   * `planGoals` ALTINDA DEĞİL: ikisi ayrı tablo, ayrı çapa. Aylık bir
   * hedefi kaydetmek haftalık listeyi tazelemeyi gerektirmez — ortak
   * bir önek, iki ekranı birbirinin yazmasına bağımlı kılardı.
   *
   * Hafta başına ayrı anahtar (`planGoalsMonth` ile aynı gerekçe):
   * hedefler yıllar boyunca birikir ama ekran hep tek hafta okur.
   */
  weekGoals: () => ["week-goals"] as const,
  weekGoalsWeek: (weekStart: DateStr) => ["week-goals", weekStart] as const,

  /*
   * Alınacaklar (0015).
   *
   * Anahtar "shopping-items": TİRELİ TEK PARÇA, `plan-goals` ve
   * `week-goals` ile aynı gerekçe — ileride eklenecek bir
   * `qk.shopping(...)` anahtarının önek eşleşmesiyle bunu da geçersiz
   * kılması yapısal olarak imkânsız kalsın.
   *
   * `planGoalsMonth`/`weekGoalsWeek`'in aksine ALT ANAHTARI YOK ve
   * olamaz: bu kalemlerin tarihi yoktur, bölünecek bir ölçek de
   * yoktur. Tek sorgu oluşu `categories()` ve `sectionLabels()` ile
   * aynı gerekçeye dayanır — kullanıcı başına bir avuç satır ve ekran
   * hepsini birden ister; kalem başına anahtar, tek listede onlarca ağ
   * turu demek olurdu.
   */
  shoppingItems: () => ["shopping-items"] as const,

  /*
   * Denemeler (0018).
   *
   * Anahtar "denemeler": TİRELİ değil ama TEK PARÇA — `plan-goals` ve
   * `week-goals`'ın çakışma gerekçesi burada yapısal olarak yok, çünkü
   * "deneme" tek kelime ve altına yalnızca BU ailenin anahtarları
   * giriyor.
   *
   * Liste TEK sorgudur, ay/hafta başına bölünmez. `planGoalsMonth`'un
   * bölünme gerekçesi ("yıllar boyunca birikir, hep tek ay okunur")
   * burada TERSİNE işliyor: deneme trendi tam olarak uzun seriyi
   * görmek için var. Ölçeğe bölünse trend çizgisi her ölçek
   * değişiminde yeni bir ağ turu isterdi ve yılın tamamını çizmek
   * on iki sorgu olurdu. Hacim de küçük: haftada bir-iki deneme,
   * yılda ~100 satır.
   *
   * Ders satırları AYRI anahtar DEĞİL — listeyle birlikte tek
   * sorguda gömülü gelirler (bkz. fetchDenemeler). Net onlardan
   * türetildiği için derssiz bir deneme satırı ekranda hiçbir işe
   * yaramaz; ayrı anahtar, her satır için ikinci bir bekleme demekti.
   */
  denemeler: () => ["denemeler"] as const,
  /*
   * Tek denemenin detayı.
   *
   * Listenin ALTINDA: bir denemeyi düzenlemek hem detayı hem listedeki
   * netini tazelemeli, yoksa liste eski neti gösterirdi. Önek
   * eşleşmesi burada tam olarak istenen işi ücretsiz yapıyor —
   * `notePlansMonth` ile aynı yön.
   */
  deneme: (id: string) => ["denemeler", id] as const,

  /*
   * Bir denemenin yanlışları.
   *
   * `denemeler` önekinin ALTINDA DEĞİL ve bu bilerek: yanlışa fotoğraf
   * eklemek denemenin netini DEĞİŞTİRMEZ. Ortak önek, her fotoğraf
   * yüklemesinde deneme listesinin ve ders satırlarının yeniden
   * çekilmesi demekti — `planGoals`'ın önekten kaçınma gerekçesiyle
   * aynı: gereksiz iş.
   *
   * Deneme başına ayrı anahtar: yanlışlar denemenin çocuğu ve ekran
   * hep tek denemenin yanlışlarını okur.
   */
  denemeYanlislari: () => ["deneme-yanlislari"] as const,
  denemeYanlislariFor: (denemeId: string) =>
    ["deneme-yanlislari", denemeId] as const,
  /*
   * Vadesi gelen tekrarlar — Bugün ekranının kuyruğu.
   *
   * `denemeYanlislariFor` ile aynı önekte: bir yanlışı tekrar olarak
   * işaretlemek hem denemenin listesini hem kuyruğu tazelemeli.
   * Tarih anahtarın parçası; gün dönünce kuyruk kendiliğinden
   * yenilenir ve dünkü liste önbellekte yaşamaya devam etmez.
   */
  denemeTekrarlari: (date: DateStr) =>
    ["deneme-yanlislari", "tekrar", date] as const,

  /*
   * Odak oturumları (0021).
   *
   * Anahtar "focus-sessions": TİRELİ TEK PARÇA, `plan-goals` ve
   * `week-goals` ile aynı gerekçe — ileride eklenecek bir
   * `qk.focus(...)` anahtarının önek eşleşmesiyle bunu da geçersiz
   * kılması yapısal olarak imkânsız kalsın.
   *
   * Gün başına alt anahtar: ekran YALNIZCA "bugün ne kadar
   * odaklandım" sorusunu soruyor ve oturumlar yıllar boyunca
   * birikiyor — `planGoalsMonth`'un bölünme gerekçesinin aynısı.
   *
   * Bir oturum kaydedilince ÖNEK tazeleniyor ve bu istenen yön
   * (`notePlansMonth` ile aynı): gece yarısına saniyeler kala biten
   * bir oturumun hangi güne düştüğü belirsizleşebilir ve öneki
   * tazelemek her iki günü de doğruya çekiyor.
   */
  focusSessions: () => ["focus-sessions"] as const,
  focusSessionsDay: (date: DateStr) =>
    ["focus-sessions", "day", date] as const,
} as const;
