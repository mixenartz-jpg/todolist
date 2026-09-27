import type { Metadata } from "next";
import { GoalTreeScreen } from "@/features/planlama/GoalTreeScreen";

export const metadata: Metadata = { title: "Haftalık hedef ağacı · Kero YKS" };

/*
 * Haftalık hedefin ağacı (0025). Aylık ağaçla AYNI ekran; yalnızca
 * sahip türü farklı. `hafta` statik segmenti `[id]`'den önce eşleşir,
 * yani `/planlama/hedefler/hafta` hiçbir zaman aylık hedef kimliği
 * sanılmaz. `params` bu Next sürümünde Promise (bkz. ../../[id]).
 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GoalTreeScreen owner={{ kind: "week", id }} />;
}
