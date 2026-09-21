import type { Metadata } from "next";
import { DashboardScreen } from "@/features/dashboard/DashboardScreen";

export const metadata: Metadata = { title: "Panel · Rutin" };

/**
 * Kök — kontrol paneli.
 *
 * Açılış "şimdi ne yapmalıyım" sorusunu cevaplar. Eskiden burası rutin
 * matrisiydi ("bu ay nasıl gidiyorum" — geriye bakmak) ve o `/tablo`ya
 * taşındı; bir süre de `/bugun`'e yönlendiren boş bir dosyaydı.
 *
 * Public landing YOK: uygulama tek kullanıcılı ve girişsiz gelen
 * zaten `middleware.ts` tarafından `/giris`e yollanıyor. Tanıtım
 * sayfası, tanıtılacak kimse olmadığı için yazılmadı.
 */
export default function RootPage() {
  return <DashboardScreen />;
}
