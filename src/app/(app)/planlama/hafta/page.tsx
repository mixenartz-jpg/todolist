import { redirect } from "next/navigation";

/**
 * Hafta ölçeği artık VARSAYILAN — `/planlama`.
 *
 * `ay/page.tsx` ile aynı gerekçe, ters yön: hafta varsayılan olduğu
 * için URL'e yazılmıyor, dolayısıyla eski `?ol=hafta` adresi de düz
 * `/planlama`'ya düşmeli.
 *
 * Dosya redirect olarak duruyor: adres yer imlerinde ve tarayıcı
 * geçmişinde olabilir, PWA'da 404 çıkmaz sokaktır.
 */
export default function PlanlamaHaftaPage() {
  redirect("/planlama");
}
