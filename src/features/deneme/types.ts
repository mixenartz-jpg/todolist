import type { DateStr } from "@/lib/date/types";
import type { HataTuru } from "./hatasepeti";
import type { DenemeAlan, DenemeTur } from "./sinav";

/**
 * Deneme oturumu — uygulamanın "nasıl gidiyorum" birimi (0018).
 *
 * ── NET ALANI YOK ve olmamalı ──
 * `DenemeRow`'un gerekçesi burada da geçerli: net `dogru - yanlis / 4`
 * ile ders satırlarından türetilir. Bu arayüze bir `net` alanı
 * konsaydı, onu kimin doldurduğu (sorgu mu, mutation mı, ekran mı)
 * belirsizleşir ve ders satırı değişip net değişmediğinde tip sistemi
 * hiçbir şey söylemezdi. Net isteyen `toplamNet(deneme.dersler)` çağırır
 * — hesap her zaman elindeki satırlardan çıkar.
 */
export interface Deneme {
  id: string;
  /** Kullanıcının ekranda BÜYÜKÇE göreceği ad: "3D Yayınları TYT-7". */
  ad: string;
  tur: DenemeTur;
  /** Yalnız `tur === "ayt"` iken dolu — 0018 `deneme_alan_tutarli`. */
  alan: DenemeAlan | null;
  /** Denemenin ÇÖZÜLDÜĞÜ gün; kaydedildiği an değil. */
  tarih: DateStr;
  sureDk: number | null;
  note: string | null;
}

/**
 * Bir denemenin ders kırılımı.
 *
 * Değişmez: `dogru + yanlis + bos === soruSayisi`. Hem veritabanı
 * kısıtı (0018) hem istemci kontrolü (`dagilimGecerli`) bunu korur;
 * ikisi de varsa biri atlandığında diğeri yakalar.
 */
export interface DenemeDers {
  id: string;
  denemeId: string;
  ders: string;
  dogru: number;
  yanlis: number;
  bos: number;
  soruSayisi: number;
  /**
   * "Bu dersten kaç net istiyordum?" — null yaygın ve meşru.
   *
   * Sayı olarak tutulur: satırda `numeric` olduğu için supabase-js onu
   * STRING getirir ve sınırda `Number()` ile açılır (bkz. `toDenemeDers`).
   * Tipi burada `number` yapmak, o dönüşümü unutmayı imkânsız kılar.
   */
  hedefNet: number | null;
  sortOrder: number;
}

/** Deneme + ders satırları — liste ve detayın birlikte istediği şekil. */
export interface DenemeDetayli extends Deneme {
  dersler: DenemeDers[];
}

/**
 * Bir denemede yapılan yanlış (0019).
 *
 * `konu` ve `hataTuru` null olabilir ve bu bir eksiklik DEĞİL, tasarım:
 * deneme biter bitmez fotoğraf çekilir, etiketleme sonraki oturumun
 * işidir. Kayıt anında zorunlu kılmak uydurma veri üretirdi.
 */
export interface DenemeYanlis {
  id: string;
  denemeId: string;
  ders: string;
  konu: string | null;
  soruNo: number | null;
  hataTuru: HataTuru | null;
  note: string | null;
  /**
   * Storage yolu (`<user_id>/<uuid>.webp`) — İMZALI URL DEĞİL.
   *
   * İmzalı URL'in ömrü bir saat; saklansaydı önbellekte bayatlar ve
   * ertesi gün açılan sayfada kırık görsel olurdu. Yol kalıcı, imza
   * her görüntülemede tazelenir (bkz. `useSignedImageUrl`).
   */
  imagePath: string | null;
  /**
   * Görselin piksel ölçüleri — layout shift'i önlemenin tek yolu.
   *
   * Null ise görsel de yoktur. İkisi birlikte yazılır, birlikte silinir.
   */
  imageWidth: number | null;
  imageHeight: number | null;
  /** Tamamlanan tekrar sayısı (0..4), "hangi aralık" değil. */
  reviewStage: number;
  /** null → yanlış mezun oldu, bir daha kuyrukta görünmez. */
  nextReviewDate: DateStr | null;
}

/** Yeni deneme — kimliği ve zaman damgalarını sunucu üretir. */
export interface DenemeDraft {
  ad: string;
  tur: DenemeTur;
  alan: DenemeAlan | null;
  tarih: DateStr;
  sureDk: number | null;
  note: string | null;
  /**
   * Ders satırları denemeyle BİRLİKTE gelir.
   *
   * Ayrı bir "önce denemeyi kur, sonra derslerini ekle" akışı olsaydı,
   * ilk yazma başarılı ikincisi başarısız olduğunda ekranda dersleri
   * olmayan bir deneme kalırdı — kullanıcının silmesi gereken bir
   * hayalet. Tek çağrı, tek sonuç.
   */
  dersler: DenemeDersDraft[];
}

/** Yeni ders satırı — `denemeId` insert sırasında bağlanır. */
export interface DenemeDersDraft {
  ders: string;
  dogru: number;
  yanlis: number;
  bos: number;
  soruSayisi: number;
  hedefNet: number | null;
  sortOrder: number;
}

/**
 * Sıkıştırılmış ama henüz YÜKLENMEMİŞ görsel.
 *
 * Ölçüler blob ile birlikte taşınır: yükleme bittikten sonra
 * görselden tekrar okunsaydı ikinci bir decode gerekir, üstelik
 * `image_width`/`image_height` satıra yazılamadan önce ekran
 * görseli ölçüsüz çizmek zorunda kalır — yani layout shift.
 */
export interface PendingImage {
  blob: Blob;
  width: number;
  height: number;
}

/** Yeni yanlış kaydı. Görsel ve etiketler sonradan eklenir. */
export interface DenemeYanlisDraft {
  denemeId: string;
  ders: string;
  konu: string | null;
  soruNo: number | null;
  hataTuru: HataTuru | null;
  note: string | null;
  imagePath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
}

/**
 * Uzunluk sınırları — SQL check kısıtlarını (0018/0019) aynalar.
 *
 * `maxLength` olarak input'ta tüketilir ki kullanıcı sunucudan hata
 * almadan önce sınırı görsün — `SHOPPING_TITLE_MAX` ile aynı gerekçe.
 */
export const DENEME_AD_MAX = 120;
export const DERS_AD_MAX = 60;
export const KONU_AD_MAX = 80;
export const DENEME_NOTE_MAX = 2000;

/** Süre sınırı (dakika) — 0018 `sure_dk` kısıtıyla birebir. */
export const SURE_DK_MAX = 400;

/** Görsel yükleme bucket'ı. Bucket adı TEK yerde yazılır (0020). */
export const DENEME_BUCKET = "deneme-gorselleri";
