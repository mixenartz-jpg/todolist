/**
 * Görev açıklaması düzenlemenin karar mantığı.
 *
 * `tasks/rename.ts`'in kardeşi ve aynı gerekçeyle bileşenden AYRI: bu
 * depoda yalnızca `.test.ts` çalışıyor, React test kütüphanesi yok ve
 * asıl kırılgan yer `onBlur` — kullanıcı hiçbir şey yazmadan başka bir
 * yere tıkladığında da tetikleniyor.
 *
 * ── `rename.ts`'ten AYRILAN yer: boş girdinin anlamı ──
 * Orada boş girdi "bu düzenlemeyi YOK SAY" demekti, çünkü `tasks.title`
 * veritabanında `length(trim(title)) between 1 and 200` ile korunuyor
 * (0001) ve adsız görev diye bir şey yok.
 *
 * Burada tam tersi: `note` NULLABLE'dır ve notu boşaltmak meşru bir
 * harekettir — "artık bu açıklamaya gerek yok" demenin tek yolu budur.
 * Bu yüzden boş girdi `null` döner ve `null` bir SİLME emridir, yok
 * sayma değil. `sections.ts`'in boş-girdi semantiğiyle aynı taraftayız.
 *
 * Sınır aşımı bu ayrımı zorlaştırıyor ve `undefined` ile çözülüyor —
 * gerekçe `normalizeNoteInput`'ta.
 */

/**
 * Açıklama uzunluk sınırı.
 *
 * SQL check kısıtını aynalar (0001: `length(note) <= 2000`) ve
 * textarea'da `maxLength` olarak tüketilir ki kullanıcı sunucudan hata
 * almadan önce sınırı görsün — `TASK_TITLE_MAX` ile aynı gerekçe.
 */
export const TASK_NOTE_MAX = 2000;

/**
 * Girilen açıklamayı kaydedilebilir biçime indirger.
 *
 * ÜÇ ayrı sonuç döner ve üçü de farklı şey söyler:
 *
 *   `string`    → bunu yaz
 *   `null`      → notu SİL (boş girdi meşru bir temizleme emridir)
 *   `undefined` → geçersiz, bu düzenlemeyi YOK SAY
 *
 * Sınır aşımında neden `undefined` ve neden `null` DEĞİL: `null` notu
 * silerdi. Yani kullanıcı 2001 karakter yazdığında, cezası yazdığının
 * reddedilmesi değil MEVCUT NOTUNUN SİLİNMESİ olurdu. Kırpmak da
 * yanlış — `rename.ts`'in gerekçesi burada da geçerli: kullanıcının
 * yazdığından farklı bir şeyi sessizce kaydetmek olurdu.
 *
 * Textarea zaten `maxLength` ile bu duruma girmeyi engelliyor; buradaki
 * kontrol sunucuya reddedilecek bir satır göndermemek için son savunma.
 */
export function normalizeNoteInput(input: string): string | null | undefined {
  const trimmed = input.trim();

  if (trimmed.length === 0) return null;
  if (trimmed.length > TASK_NOTE_MAX) return undefined;

  return trimmed;
}

/**
 * Bu düzenleme sunucuya yazılmalı mı?
 *
 * `shouldPersistTitle` ile aynı amaç: düzenleme kutusunu açıp hiçbir
 * şey değiştirmeden kapatmak — ki blur ile bu çok kolay olur — bir
 * yazma işlemi olmamalı.
 *
 * `current` görevin şu anki notu, `next` `normalizeNoteInput` çıktısı.
 */
export function shouldPersistNote(
  current: string | null,
  next: string | null | undefined,
): boolean {
  // Geçersiz girdi (sınır aşımı) hiçbir zaman yazılmaz.
  if (next === undefined) return false;

  /*
   * Notu OLMAYAN bir görevde alanı boş bırakmak bir değişiklik
   * değildir. `null === null` bunu yakalar; ayrıca boşluk yazıp
   * silmek de buraya düşer çünkü `normalizeNoteInput` kırpıyor.
   */
  if (next === null) return current !== null;

  // Karşılaştırma KIRPILMIŞ değerle: sonuna boşluk eklemek bir
  // değişiklik sayılmaz, çünkü kaydedilecek değer zaten aynı olurdu.
  return next !== current?.trim();
}
