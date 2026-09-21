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
}
