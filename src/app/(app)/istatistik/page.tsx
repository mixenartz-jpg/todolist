import type { Metadata } from "next";
import { StatsScreen } from "@/features/stats/StatsScreen";

export const metadata: Metadata = { title: "İstatistik · Rutin" };

export default function Page() {
  return <StatsScreen />;
}
