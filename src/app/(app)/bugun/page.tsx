import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Bugün · Rutin" };

export default function Page() {
  return (
    <ComingSoon
      title="Bugün"
      description="Bugünün rutinlerini hızlıca işaretleyeceğin, tek seferlik görevlerini ve günlük notunu ekleyeceğin ekran. Faz 2'de geliyor — şu an tablodan işaretleyebilirsin."
    />
  );
}
