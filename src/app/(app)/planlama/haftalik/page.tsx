import { redirect } from "next/navigation";

/**
 * Haftalık hedefler artık ayrı bir ekran değil — Hedefler'in içinde
 * bir bölüm.
 *
 * Gerekçe: ayrı sekme oldukları sürece aylık ve haftalık hedefler
 * birbirinden habersiz iki listeydi ve 0014'ün kurduğu bağ (haftalık
 * hedef = aylık hedefin dilimi) yalnızca tek yönde okunuyordu.
 *
 * Dosya redirect olarak duruyor: adres yer imlerinde olabilir ve
 * PWA'da 404 çıkmaz sokaktır.
 */
export default function PlanlamaHaftalikPage() {
  redirect("/planlama/hedefler");
}
