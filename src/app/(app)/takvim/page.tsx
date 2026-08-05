import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Takvim · Rutin" };

export default function Page() {
  return (
    <ComingSoon
      title="Takvim"
      description="Aylık takvim görünümü — her gün tamamlanma yoğunluğuna göre renklenir, bir güne tıklayınca o günün detayı açılır. Faz 2'de geliyor."
    />
  );
}
