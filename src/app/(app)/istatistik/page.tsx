import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "İstatistik · Rutin" };

export default function Page() {
  return (
    <ComingSoon
      title="İstatistik"
      description="Seri kartları, yıllık ısı haritası, tamamlanma yüzdeleri ve trend grafikleri. Faz 3'te geliyor — hesaplama mantığı hazır, ekran kalıyor."
    />
  );
}
