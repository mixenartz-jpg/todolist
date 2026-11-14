import type { Metadata } from "next";
import { StudentTodayScreen } from "@/features/student/StudentTodayScreen";
import { isDateStr } from "@/lib/date/date";

export const metadata: Metadata = { title: "Bugün · Kero YKS" };

/** Seçili gün `?gun=YYYY-MM-DD`; yoksa bugün. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ gun?: string | string[] }>;
}) {
  const { gun } = await searchParams;
  const day = typeof gun === "string" && isDateStr(gun) ? gun : null;
  return <StudentTodayScreen day={day} />;
}
