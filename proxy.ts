import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/*
 * Next 16'da `middleware.ts` → `proxy.ts` oldu (eski ad deprecated).
 * Davranış aynı: oturumu tazeler, girişsizleri ve rol dışı yolları
 * kapıda tutar.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Statik dosyalar ve görseller dışındaki her yol.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
