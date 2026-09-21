import { redirect } from "next/navigation";

/**
 * Ay ölçeği artık ayrı bir rota değil — `/planlama`'nın varsayılanı.
 *
 * Dosya redirect olarak duruyor: adres yer imlerinde ve tarayıcı
 * geçmişinde olabilir, PWA'da 404 çıkmaz sokaktır.
 */
export default function PlanlamaAyPage() {
  redirect("/planlama");
}
