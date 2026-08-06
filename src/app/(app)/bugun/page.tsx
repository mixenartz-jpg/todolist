import type { Metadata } from "next";
import { TodayScreen } from "@/features/today/TodayScreen";

export const metadata: Metadata = { title: "Bugün · Rutin" };

export default function Page() {
  return <TodayScreen />;
}
