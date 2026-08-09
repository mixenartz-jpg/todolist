import type { Metadata } from "next";
import { WeekScreen } from "@/features/week/WeekScreen";

export const metadata: Metadata = { title: "Hafta · Rutin" };

export default function Page() {
  return <WeekScreen />;
}
