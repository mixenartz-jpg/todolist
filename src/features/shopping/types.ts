/**
 * Alınacaklar — tarihsiz hatırlatıcı kalemleri (0015).
 *
 * `Task` ile aynı şey DEĞİLDİR ve olmaması bilerek: burada saat, süre,
 * kategori, hedef ve tarih YOKTUR. Bu listenin tek işi "aklımda kalsın"
 * demektir; görevin taşıdığı planlama makinesi buraya girseydi, üç
 * alanlık bir kalem beş kontrollü bir satıra dönerdi.
 */
export interface ShoppingItem {
  id: string;
  title: string;
  /**
   * Kalemin alındığı an; null → henüz alınmadı.
   *
   * `Task.done`'un boolean'ı yerine `WeekGoal.completedAt`'in zaman
   * damgası seçildi — gerekçe migration 0015'te. İşaretlenen kalem
   * listeden DÜŞMEZ, üstü çizili olarak kalır.
   */
  completedAt: string | null;
  sortOrder: number;
}

/** Yeni kalem — kimliği ve zaman damgalarını sunucu üretir. */
export interface ShoppingItemDraft {
  title: string;
  sortOrder: number;
}

/**
 * Başlık uzunluk sınırı.
 *
 * SQL check kısıtını aynalar (0015) ve input'ta `maxLength` olarak
 * tüketilir ki kullanıcı sunucudan hata almadan önce sınırı görsün —
 * `SECTION_LABEL_MAX` ile aynı gerekçe.
 */
export const SHOPPING_TITLE_MAX = 120;
