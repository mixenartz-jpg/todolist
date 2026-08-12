import { redirect } from "next/navigation";

/**
 * Eski Plan ekranı /planlama'ya taşındı.
 *
 * Dosya SİLİNMEDİ, yönlendirmeye çevrildi: uygulama `standalone` PWA
 * olarak da çalışıyor ve orada 404, çıkış yolu olmayan bir çıkmaz
 * sokaktır. Tarayıcı geçmişi ve otomatik tamamlama bu adresi
 * hatırlıyor olabilir; maliyeti dört satır.
 *
 * `permanentRedirect()` KULLANILMADI: 308 tarayıcıda kalıcı önbelleğe
 * alınır ve /takvim/plan ileride başka bir şeye dönüşürse geri
 * alınamaz. Tek kullanıcılı bir uygulamada SEO kaygısı yok.
 *
 * `next.config`'in `redirects()`'i de değil: depoda o yüzey hiç
 * kullanılmamış ve tek bir eski URL için yeni bir yapılandırma açmak
 * ağır olurdu. Dosyanın burada durması "burası taşındı"yı kendi
 * kendine belgeliyor.
 */
export default function TakvimPlanPage() {
  redirect("/planlama/ay");
}
