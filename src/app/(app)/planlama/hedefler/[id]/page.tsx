import type { Metadata } from "next";
import { GoalTreeScreen } from "@/features/planlama/GoalTreeScreen";

export const metadata: Metadata = { title: "Hedef ağacı · Kero YKS" };

/*
 * `params` bir Promise — bu Next sürümünde dinamik segmentler
 * asenkron çözülüyor (bkz. istatistik/denemeler/[id]).
 *
 * `<Suspense>` YOK ve gerekmiyor: kardeş sayfaların sarmalanma
 * gerekçesi `useSearchParams` (usePlanlamaSurface) — bu ekran URL
 * sorgusunu okumuyor, hedefi yol parametresinden alıyor.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GoalTreeScreen goalId={id} />;
}
