import { redirect } from "next/navigation";

/**
 * Kök — şimdilik Bugün'e düşer.
 *
 * F8'de burası kontrol paneli olacak: günün durumu, haftanın planı,
 * hedef ilerlemesi ve koçluk satırı tek ekranda. O gelene kadar
 * kullanıcıyı boş bir sayfaya değil, günün işine bırakmak doğru.
 *
 * Eski açılış (rutin matrisi) `/tablo`'ya taşındı.
 */
export default function RootPage() {
  redirect("/bugun");
}
