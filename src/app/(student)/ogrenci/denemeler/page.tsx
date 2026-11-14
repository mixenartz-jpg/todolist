import type { Metadata } from "next";
import { DenemeListesi } from "@/features/deneme/DenemeListesi";

export const metadata: Metadata = { title: "Denemeler · Kero YKS" };

export default function Page() {
  return <DenemeListesi />;
}
