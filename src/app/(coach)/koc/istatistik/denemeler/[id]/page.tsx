import type { Metadata } from "next";
import { DenemeDetay } from "@/features/deneme/DenemeDetay";

export const metadata: Metadata = { title: "Deneme · Kero YKS" };

/*
 * `params` bir Promise — bu Next sürümünde dinamik segmentler
 * asenkron çözülüyor. Doğrudan `params.id` okumak derleme hatası
 * verir.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DenemeDetay denemeId={id} />;
}
