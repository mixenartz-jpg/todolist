import { redirect } from "next/navigation";
import { HOME_BY_ROLE } from "@/lib/auth/roles";
import { getViewer } from "@/lib/auth/viewer";

/**
 * Kök — role göre ana ekrana. Proxy bunu zaten yapıyor; bu sayfa
 * yalnızca proxy'nin atlandığı durumlar için emniyet kemeri.
 */
export default async function RootPage() {
  const viewer = await getViewer();
  redirect(viewer ? HOME_BY_ROLE[viewer.role] : "/giris");
}
