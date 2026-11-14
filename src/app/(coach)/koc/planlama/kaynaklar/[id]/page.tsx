import type { Metadata } from "next";
import { SourceDetail } from "@/features/sources/SourceDetail";

export const metadata: Metadata = { title: "Kaynak · Kero YKS" };

/* `params` bir Promise — bu Next sürümünde dinamik segmentler asenkron. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SourceDetail sourceId={id} />;
}
