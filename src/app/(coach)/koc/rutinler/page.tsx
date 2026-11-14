import type { Metadata } from "next";
import { RoutineList } from "@/features/routines/RoutineList";

export const metadata: Metadata = { title: "Rutinler · Kero YKS" };

export default function Page() {
  return <RoutineList />;
}
