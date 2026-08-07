import type { DateStr } from "@/lib/date/types";

/**
 * Sınav çalışmasında yapılan bir yanlış.
 *
 * Kayıt birimi TEK BİR yanlıştır, bir deneme ya da oturum değil: ekran
 * görüntüsü ve not doğal olarak tek bir soruya aittir ve çetele bu
 * satırlardan sayılarak üretilir.
 */
export interface Mistake {
  id: string;
  ders: string;
  konu: string;
  /** Yanlışın yapıldığı gün; kaydedildiği an değil. */
  date: DateStr;
  note: string | null;
  /** Storage yolu. null → ekran görüntüsü yok. İmzalı URL DEĞİLDİR. */
  imagePath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  /** Tamamlanan tekrar sayısı (0..4). 4 = mezun. */
  reviewStage: number;
  /** Sonraki tekrarın vadesi. null ⇔ mezun. */
  nextReviewDate: DateStr | null;
  createdAt: string;
  updatedAt: string;
}

export interface MistakeDraft {
  ders: string;
  konu: string;
  date: DateStr;
  note: string | null;
  /**
   * Yüklenecek görsel. null → görsel yok (yeni kayıtta) ya da
   * değişmedi (düzenlemede).
   */
  image: PendingImage | null;
}

/** İstemcide sıkıştırılmış, yüklenmeye hazır görsel. */
export interface PendingImage {
  blob: Blob;
  width: number;
  height: number;
}

/*
 * SQL check kısıtlarını aynalar; input'larda `maxLength` olarak
 * tüketilir ki kullanıcı sunucudan hata almadan önce sınırı görsün.
 */
export const DERS_MAX = 60;
export const KONU_MAX = 80;
export const MISTAKE_NOTE_MAX = 2000;
