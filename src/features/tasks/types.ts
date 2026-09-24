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
   * Görevin BİTTİĞİ an, ISO damga.
   *
   * null → ya hiç bitmedi ya da 0017 öncesinde bitti. Arşiv bu ikinci
   * durumda `dueDate`'e düşüyor (bkz. `archive.ts`) — geriye dönük bir
   * zaman uydurmak yerine elimizdeki en yakın gerçeğe yaslanıyoruz.
   *
   * `done` ile ayrı tutuluyor ve birleştirilemez: `done` bir DURUM,
   * bu bir ZAMAN. İşaretlemeyi geri alan kullanıcıda damga da
   * siliniyor, yoksa "bitmemiş ama şu an bitmiş" diye çelişkili bir
   * satır kalırdı.
   */
  completedAt: string | null;
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
  /**
   * Görevin DOĞDUĞU plan düğümü (0022). null → düğümsüz görev.
   *
   * `goalId`'nin yerine değil, YANINDA durur: ağaçtan dağıtılan görev
   * ikisini birden taşır. `goalId` "hangi hedef", `nodeId` "o hedefin
   * hangi kalemi" sorusunu cevaplıyor — aynı görev kümesinin iki
   * çözünürlüğü, iki ayrı sayaç değil. Çift sayım bu yüzden
   * imkânsız: `goalProgress` görevleri `goalId`'den sayar,
   * `goalTreeProgress` aynı görevleri `nodeId`'den gruplar.
   *
   * Düğüm silinince null'a düşer (`on delete set null`): görevin
   * kendisi bir kayıttır ve tamamlanmış geçmişi korunmalıdır.
   */
  nodeId: string | null;
  /**
   * Görevin KENDİ rengi (0..7). null → KATEGORİDEN DEVRAL.
   *
   * `categoryId`'nin null'ıyla aynı ruhta birinci sınıf bir durum:
   * görevlerin çoğu kendi rengini taşımaz ve kategorisinin rengiyle
   * çizilir. Renk verildiğinde kategoriyi EZER — çözüm sırası tek
   * yerde, `taskColorSlot`'ta (color.ts).
   *
   * Neden kategori rengi yetmedi: ızgarada aynı kategoriden beş blok
   * yan yana geldiğinde renk hiçbir şeyi ayırmıyor (gerekçe 0013).
   */
  colorSlot: number | null;
}

export interface TaskDraft {
  title: string;
  dueDate: DateStr | null;
  note: string | null;
  /**
   * Doğduğu anda bağlı olduğu aylık hedef; null → bağımsız görev.
   *
   * ── Neden DOĞUŞTA, sonradan değil? ──
   * Bağlama akışı zaten vardı (gün panelindeki hedef seçici) ama
   * pratikte kullanılmıyordu: görevi yazarken hedefi düşünmek için
   * bir sebep yoktu, sonradan dönüp bağlamak ise ayrı bir iş.
   * Hedef şeridindeki `[+]` sırayı tersine çeviriyor — kullanıcı
   * ÖNCE hedefi seçiyor, görev o bağlamda doğuyor.
   *
   * Opsiyonel: çağıranların çoğu (havuz, gün satırı, Bugün ekranı)
   * hedefsiz görev üretiyor ve her birine `goalId: null` yazdırmak
   * gürültü olurdu.
   */
  goalId?: string | null;
  /**
   * Doğduğu plan düğümü; null/verilmemiş → düğümsüz görev (0022).
   *
   * `goalId` ile birlikte verilir: ağaçtan dağıtılan görev hem hedefi
   * hem kalemi bilir. Opsiyonel oluşunun gerekçesi `goalId`'ninkiyle
   * aynı — çağıranların çoğu düğümsüz görev üretiyor.
   */
  nodeId?: string | null;
}
