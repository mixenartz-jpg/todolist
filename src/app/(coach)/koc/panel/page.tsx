import type { Metadata } from "next";
import { DashboardScreen } from "@/features/dashboard/DashboardScreen";

export const metadata: Metadata = { title: "Panel · Kero YKS" };

/** Koç paneli — öğrencinin bugünü, haftası, dikkat gerektirenler. */
export default function Page() {
  return <DashboardScreen />;
}
