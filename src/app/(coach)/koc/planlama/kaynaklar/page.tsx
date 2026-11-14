import type { Metadata } from "next";
import { SourcesScreen } from "@/features/sources/SourcesScreen";

export const metadata: Metadata = { title: "Kaynaklar · Kero YKS" };

export default function Page() {
  return <SourcesScreen />;
}
