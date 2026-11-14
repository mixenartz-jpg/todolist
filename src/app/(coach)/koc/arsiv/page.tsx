import type { Metadata } from "next";
import { ArchiveScreen } from "@/features/archive/ArchiveScreen";

export const metadata: Metadata = { title: "Arşiv · Kero YKS" };

/**
 * Arşiv — "ne yaptım", gün gün. ANA SEKME.
 *
 * Yerini Tablo'dan aldı: beş sekme sınırı (320px'te altıncısı
 * etiketleri kırpar) ikisini birden taşımıyor ve seçim kullanım
 * sıklığına göre yapıldı — arşiv günlük açılıyor, matris ayda
 * birkaç kez. Gerekçenin tamamı `AppShell.tsx`'te.
 */

export default function ArsivPage() {
  return <ArchiveScreen />;
}
