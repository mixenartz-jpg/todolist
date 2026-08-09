/**
 * Görev adı düzenlemenin karar mantığı.
 *
 * Bileşenden AYRILDI, `sections.ts`'teki gerekçeyle aynı: bu depoda
 * yalnızca `.test.ts` çalıştırılıyor ve React test kütüphanesi kurulu
 * değil. `TaskItem` içinde kalsaydı hiçbir test buraya ulaşamazdı,
 * oysa asıl kırılgan yer burası — `onBlur` kullanıcı hiçbir şey
 * yazmadan başka yere tıkladığında da tetikleniyor.
 *
 * ── `sections.ts`'ten AYRILAN yer ──
 * Orada boş girdi "varsayılana dön" demekti ve `null` bir SİLME
 * emriydi. Burada öyle değil: `tasks.title` veritabanında
 * `length(trim(title)) between 1 and 200` kısıtıyla korunuyor
 * (migration 0001), yani adsız görev diye bir şey yok. Boş girdinin
 * tek doğru karşılığı "bu düzenlemeyi yok say"dır — görevi silmek
 * değil. Kullanıcı bir adı silmek istiyorsa görevi siler; alanı
 * boşaltmak yanlışlıkla yapılan bir hareket olabilir ve veri
 * kaybettirmemeli.
 */

/**
 * Başlık uzunluk sınırı.
 *
 * SQL check kısıtını aynalar (0001) ve input'ta `maxLength` olarak
 * tüketilir ki kullanıcı sunucudan hata almadan önce sınırı görsün —
 * `SECTION_LABEL_MAX` ile aynı gerekçe. `TaskQuickAdd` de aynı sayıyı
 * kullanıyor; ekleme ile yeniden adlandırma aynı sınıra tabi olmalı.
 */
export const TASK_TITLE_MAX = 200;

/**
 * Girilen adı kaydedilebilir biçime indirger; geçersizse `null`.
 *
 * `null` burada "yazacak bir şey yok, düzenlemeyi yok say" demektir —
 * `sections.ts`'teki gibi bir silme emri DEĞİL.
 *
 * Sınırı aşan girdi KIRPILMAZ: kırpmak kullanıcının yazdığından farklı
 * bir şeyi sessizce kaydetmek olurdu. Input zaten `maxLength` ile bu
 * duruma girmeyi engelliyor; buradaki kontrol sunucuya reddedilecek
 * bir satır göndermemek için son savunmadır.
 */
export function normalizeTitleInput(input: string): string | null {
  const trimmed = input.trim();

  if (trimmed.length === 0) return null;
  if (trimmed.length > TASK_TITLE_MAX) return null;

  return trimmed;
}

/**
 * Bu düzenleme sunucuya yazılmalı mı?
 *
 * Düzenleme kutusunu açıp hiçbir şey değiştirmeden kapatmak, ki blur
 * ile bu çok kolay olur, bir yazma işlemi olmamalı: her odak kaybında
 * ağa çıkmak listeyi gereksiz yere geçersiz kılar ve iyimser güncelleme
 * satırı boşuna titretir.
 *
 * `current` görevin şu anki başlığıdır; `next` `normalizeTitleInput`
 * çıktısıdır.
 */
export function shouldPersistTitle(
  current: string,
  next: string | null,
): boolean {
  // Geçersiz girdi (boş ya da sınır aşımı) hiçbir zaman yazılmaz.
  if (next === null) return false;

  // Görünen ad değişmiyorsa yazacak bir şey yok. Karşılaştırma
  // kırpılmış değerle yapılır: kullanıcı adın sonuna boşluk eklediyse
  // bu bir değişiklik sayılmaz, çünkü sunucu da onu kırpacaktı.
  if (next === current.trim()) return false;

  return true;
}
