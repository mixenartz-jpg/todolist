import { redirect } from "next/navigation";

/**
 * Takvimin kendisi bir ekran değildir; ilk görünüme yönlendirir.
 *
 * Ay varsayılandır çünkü mevcut davranıştır: `/takvim`'i yer imine
 * eklemiş ya da alışkanlıkla açan kullanıcı aynı ekranı bulmalı.
 */
export default function TakvimPage() {
  redirect("/takvim/ay");
}
