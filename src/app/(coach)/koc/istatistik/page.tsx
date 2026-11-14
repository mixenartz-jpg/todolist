import type { Metadata } from "next";
import { StatsScreen } from "@/features/stats/StatsScreen";

export const metadata: Metadata = { title: "İstatistik · Kero YKS" };

export default function Page() {
  return <StatsScreen />;
}
