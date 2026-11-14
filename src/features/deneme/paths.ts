"use client";

import { usePathname } from "next/navigation";
import { useOptionalViewer } from "@/lib/auth/ViewerProvider";

/**
 * Deneme ekranları iki yerde yaşıyor: koçta İstatistik altında,
 * öğrencide kendi sekmesinde. Bağlantılar bulunulan yüzeye göre kurulur.
 */
export function useDenemePaths() {
  const pathname = usePathname() ?? "";
  const viewer = useOptionalViewer();
  const student = pathname.startsWith("/ogrenci");
  const base = student ? "/ogrenci/denemeler" : "/koc/istatistik/denemeler";
  return {
    student,
    /** Koç öğrenci yüzeyini önizliyorsa yazma yok. */
    readOnly: viewer?.readOnly ?? false,
    list: base,
    detail: (id: string) => `${base}/${id}`,
  };
}
