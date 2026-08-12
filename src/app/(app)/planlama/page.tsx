import { redirect } from "next/navigation";

/**
 * Planlamanın kendisi bir ekran değildir; ilk görünüme yönlendirir.
 *
 * Ay varsayılandır: planlama ayın başında yapılan bir iştir ve hedefler
 * de aylık. Hafta, ayın içinde bir yakınlaşmadır.
 *
 * Neden `/planlama` doğrudan ay ekranı DEĞİL? `PlanlamaTabs` aktifliği
 * `pathname.startsWith(tab.href)` ile ölçüyor; `/planlama` hiçbir
 * sekmenin öneki olmadığı için dördü de sönük görünür ve kullanıcı
 * nerede olduğunu okuyamazdı.
 */
export default function PlanlamaPage() {
  redirect("/planlama/ay");
}
