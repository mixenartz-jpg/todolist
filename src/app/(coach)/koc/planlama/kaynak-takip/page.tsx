import type { Metadata } from "next";
import { SourceTrackScreen } from "@/features/sources/SourceTrackScreen";

export const metadata: Metadata = { title: "Kaynak takip · Kero YKS" };

export default function Page() {
  return <SourceTrackScreen />;
}
