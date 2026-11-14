import type { Metadata } from "next";
import { ScreenBody } from "@/components/Screen";
import { StudentHistory } from "@/features/student/StudentHistory";

export const metadata: Metadata = { title: "Geçmiş · Kero YKS" };

export default function Page() {
  return (
    <ScreenBody width="3xl">
      <StudentHistory />
    </ScreenBody>
  );
}
