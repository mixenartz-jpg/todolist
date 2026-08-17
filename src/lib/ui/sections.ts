/**
 * Ekran içi bölüm başlıklarının VARSAYILAN adları.
 *
 * Anahtar kümesinin tek doğruluk kaynağı burasıdır; veritabanı
 * yalnızca kullanıcının DEĞİŞTİRDİKLERİNİ tutar (bkz. migration 0007).
 * Yeni bir bölüm eklemek migration gerektirmez — buraya bir satır
 * eklemek yeter.
 *
 * ── Anahtarlar neden `ekran.bölüm` biçiminde? ──
 * "Görevler" hem Bugün ekranında hem haftalık planda geçebilir ve
 * ikisi AYRI adlandırılabilmelidir. Düz bir "tasks" anahtarı ikisini
 * birbirine bağlar, kullanıcı birini yeniden adlandırdığında diğeri de
 * sessizce değişirdi.
 *
 * ── Gezinme sekmeleri burada YOKTUR ──
 * Sekme adları uygulamanın haritasıdır, kullanıcının çalışma dili
 * değil. Bir sekmeyi yeniden adlandırmak ekran adıyla URL'i ve
 * alışkanlığı birbirinden ayırırdı.
 */
export const SECTION_DEFAULTS = {
  "today.tasks": "Görevler",
  "today.someday": "Bir ara",
  "today.review": "Tekrar",
  "today.journal": "Günlük",
  "week.overdue": "Gecikenler",
  /*
   * Plan ekranının başlıkları. `week.overdue` ile AYRI anahtarlar:
   * Hafta ve Plan iki farklı ekran ve birinde "Gecikenler"i yeniden
   * adlandırmak diğerini sessizce değiştirmemeli — ad alanı kuralının
   * tam olarak var olma sebebi bu.
   */
  /*
   * `plan.*` anahtarları ekran /planlama'ya taşınınca DEĞİŞTİRİLMEDİ.
   *
   * `section_labels` satırları `key` METNİYLE bağlıdır; anahtarı
   * `planlama.backlog` yapmak, kullanıcının verdiği adı sessizce
   * kaybettirirdi — satır yetim kalır, kod varsayılana düşerdi.
   * Anahtar ekranın YOLUNU değil BÖLÜMÜ adlandırır.
   */
  "plan.backlog": "Havuz",
  "plan.overdue": "Gecikenler",

  "planlama.dayPlan": "Günün planı",
  "planlama.goals": "Aylık hedefler",
  /*
   * `planlama.goals`'tan AYRI anahtar: biri ayın hedefleri, öteki
   * haftanın. Tek anahtar paylaşsalardı "Aylık hedefler"i yeniden
   * adlandıran kullanıcı, hiç dokunmadığı haftalık başlığı da sessizce
   * değiştirmiş olurdu — ad alanı kuralının var olma sebebi bu.
   */
  "planlama.weekGoals": "Haftalık hedefler",
  "planlama.categories": "Kategoriler",
  "planlama.summary": "Ay özeti",
} as const;

export type SectionKey = keyof typeof SECTION_DEFAULTS;

/**
 * Etiket uzunluk sınırı.
 *
 * SQL check kısıtını aynalar (0007) ve input'ta `maxLength` olarak
 * tüketilir ki kullanıcı sunucudan hata almadan önce sınırı görsün —
 * `DERS_MAX` ile aynı gerekçe.
 */
export const SECTION_LABEL_MAX = 40;

/** Bölümün gösterilecek adı: özel ad varsa o, yoksa varsayılan. */
export function resolveLabel(
  overrides: ReadonlyMap<string, string>,
  key: SectionKey,
): string {
  return overrides.get(key) ?? SECTION_DEFAULTS[key];
}

/** Kullanıcı bu bölümü yeniden adlandırmış mı? */
export function isCustomized(
  overrides: ReadonlyMap<string, string>,
  key: SectionKey,
): boolean {
  return overrides.has(key);
}

/**
 * Girilen adı kaydedilebilir biçime indirger.
 *
 * `null` dönerse satır SİLİNİR ve başlık varsayılana döner. İki durum
 * bunu üretir:
 *
 *   1. Alan boş ya da yalnızca boşluk. Ayrı bir "sıfırla" düğmesi
 *      koymak beşinci bir kontrol demekti; alanı boşaltmak zaten "adı
 *      yok" demenin doğal yoludur.
 *   2. Yazılan ad varsayılanın kendisi. Kullanıcı elle "Görevler"
 *      yazdıysa, varsayılanla birebir aynı bir satır bırakmanın anlamı
 *      yok — üstelik varsayılan bir gün değişirse o satır kullanıcıyı
 *      eski metinde kilitlerdi.
 *
 * Sınırı aşan girdi KIRPILMAZ, `null` da dönmez: kırpmak kullanıcının
 * yazdığından farklı bir şeyi sessizce kaydetmek olurdu. Input zaten
 * `maxLength` ile bu duruma girmeyi engelliyor; buradaki kontrol
 * sunucuya reddedilecek bir satır göndermemek için son savunmadır.
 */
export function normalizeLabelInput(
  key: SectionKey,
  input: string,
): string | null {
  const trimmed = input.trim();

  if (trimmed.length === 0) return null;
  if (trimmed === SECTION_DEFAULTS[key]) return null;
  if (trimmed.length > SECTION_LABEL_MAX) return null;

  return trimmed;
}

/**
 * Bu düzenleme sunucuya yazılmalı mı?
 *
 * Bileşenden AYRILDI çünkü asıl karar burada: `onBlur` kullanıcı hiçbir
 * şey yazmadan başka yere tıkladığında da tetiklenir ve her seferinde
 * ağa çıkmak, düzenleme kutusunu açıp kapatmayı bir yazma işlemine
 * çevirirdi. Saf fonksiyon olarak test edilebilir; bileşenin içinde
 * kalsaydı bu depoda (yalnızca `.test.ts` çalıştırılıyor, React test
 * kütüphanesi kurulu değil) hiçbir test ona ulaşamazdı.
 *
 * `current` çözülmüş etikettir — override yoksa varsayılana eşittir.
 */
export function shouldPersistLabel(
  key: SectionKey,
  current: string,
  next: string | null,
): boolean {
  // Görünen ad değişmiyorsa yazacak bir şey yok.
  if (next === current) return false;

  // "Varsayılana dön" istendi ama ortada silinecek bir satır yok:
  // etiket zaten varsayılan.
  if (next === null && current === SECTION_DEFAULTS[key]) return false;

  return true;
}
