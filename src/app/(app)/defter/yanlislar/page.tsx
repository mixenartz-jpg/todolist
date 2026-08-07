import type { Metadata } from "next";
import { MistakesScreen } from "@/features/mistakes/MistakesScreen";

export const metadata: Metadata = { title: "Yanlışlar · Rutin" };

export default function MistakesPage() {
  return <MistakesScreen />;
}
