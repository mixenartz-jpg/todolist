import type { Metadata } from "next";
import { ScreenBody } from "@/components/Screen";
import { StudentHistory } from "@/features/student/StudentHistory";

export const metadata: Metadata = { title: "Öğrenci · Kero YKS" };

/**
 * Koçun öğrenci sayfası: son 30 günün sonuçları. Satıra tıklamak o
 * günü "öğrenci gözüyle" salt okunur açar.
 */
export default function Page() {
  return (
    <ScreenBody width="3xl">
      <StudentHistory title="Öğrenci sonuçları — son 30 gün" />
    </ScreenBody>
  );
}
