import { redirect } from "next/navigation";

/**
 * Takvim sekmesi KALDIRILDI — ileriye bakmanın tek yeri Planlama.
 *
 * Takvim BAKMAK içindi (ay/hafta yoğunluğu), Planlama KURMAK için.
 * İkisi yan yana durunca hangisinde ne yapılacağı belirsizleşti ve
 * ikisi de aynı günleri farklı çiziyordu. Tek yüzey kaldı.
 *
 * Dosya SİLİNMEDİ, yönlendirmeye çevrildi — `takvim/plan`'ın kendi
 * gerekçesiyle aynı: `standalone` PWA'da 404, çıkış yolu olmayan bir
 * çıkmaz sokaktır ve tarayıcı geçmişi bu adresi hatırlıyor olabilir.
 */
export default function TakvimPage() {
  redirect("/planlama");
}
