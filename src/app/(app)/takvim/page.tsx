import type { Metadata } from "next";
import { CalendarScreen } from "@/features/calendar/CalendarScreen";

export const metadata: Metadata = { title: "Takvim · Rutin" };

export default function Page() {
  return <CalendarScreen />;
}
