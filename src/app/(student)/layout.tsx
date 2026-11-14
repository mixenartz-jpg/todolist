import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { getViewer } from "@/lib/auth/viewer";
import { ViewerProvider } from "@/lib/auth/ViewerProvider";

/**
 * Öğrenci yüzeyi.
 *
 * Koç da buraya girebilir: o zaman ekran öğrencinin verisini SALT
 * OKUNUR gösterir ("öğrenci gözüyle önizle"). Yazma RLS'te zaten
 * reddedilir; `readOnly` arayüzün denememesi için.
 */
export default async function StudentLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/giris");

  const preview = viewer.role === "coach";

  return (
    <ViewerProvider value={{ ...viewer, readOnly: preview }}>
      <AppShell role={preview ? "coach-preview" : "student"}>{children}</AppShell>
    </ViewerProvider>
  );
}
