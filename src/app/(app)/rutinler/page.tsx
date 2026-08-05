import type { Metadata } from "next";
import { RoutineList } from "@/features/routines/RoutineList";

export const metadata: Metadata = { title: "Rutinler · Rutin" };

export default function Page() {
  return <RoutineList />;
}
