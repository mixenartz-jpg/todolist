import { redirect } from "next/navigation";

/**
 * Ay ölçeği artık ayrı bir rota değil — `/planlama?ol=ay`.
 *
 * ── Bu satır `DEFAULT_SCALE` ile BİRLİKTE değişti ──
 * Önce burası düz `/planlama`'ya gidiyordu ve bu yalnızca ay
 * varsayılan ölçek olduğu için *tesadüfen* doğruydu. Varsayılan
 * haftaya çevrilince aynı redirect kullanıcıyı ay yerine haftaya
 * götürürdü — yer imi sessizce başka bir ekrana açılırdı.
 *
 * Dosya redirect olarak duruyor: adres yer imlerinde ve tarayıcı
 * geçmişinde olabilir, PWA'da 404 çıkmaz sokaktır.
 */
export default function PlanlamaAyPage() {
  redirect("/planlama?ol=ay");
}
