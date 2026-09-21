import type { Metadata } from "next";
import { ArchiveScreen } from "@/features/archive/ArchiveScreen";

export const metadata: Metadata = { title: "Arşiv · Rutin" };

/**
 * Arşiv — sekme DEĞİL, bağlantıyla ulaşılan ekran.
 *
 * Üst çubukta beş sekme var ve altıncısı 320px'te etiketleri kırpma
 * sınırına dayıyor (bkz. nav-bar.css aritmetiği). Arşiv geçmişe bakma
 * işi: İstatistik ekranından ve Bugün'ün gün kapanışından ulaşılıyor.
 */

export default function ArsivPage() {
  return <ArchiveScreen />;
}
