import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { HOME_BY_ROLE } from "@/lib/auth/roles";
import { getViewer } from "@/lib/auth/viewer";
import { ViewerProvider } from "@/lib/auth/ViewerProvider";

/**
 * Koç yüzeyi. Proxy öğrenciyi zaten kapıda çeviriyor; buradaki kontrol
 * ikinci kat (JWT'deki rol eskiyse veritabanındaki taze rol kazanır).
 */
export default async function CoachLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/giris");
  if (viewer.role !== "coach") redirect(HOME_BY_ROLE[viewer.role]);

  return (
    <ViewerProvider value={{ ...viewer, readOnly: false }}>
      <AppShell role="coach">{children}</AppShell>
    </ViewerProvider>
  );
}
