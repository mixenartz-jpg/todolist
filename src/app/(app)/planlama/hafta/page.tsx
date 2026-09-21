import { redirect } from "next/navigation";

/**
 * Hafta ölçeği artık ayrı bir rota değil — `/planlama?ol=hafta`.
 *
 * Dosya redirect olarak duruyor: adres yer imlerinde ve tarayıcı
 * geçmişinde olabilir, PWA'da 404 çıkmaz sokaktır.
 */
export default function PlanlamaHaftaPage() {
  redirect("/planlama?ol=hafta");
}
