/**
 * Rol yardımcıları — saf, hem proxy'de hem bileşenlerde kullanılır.
 *
 * Rol JWT'deki `app_metadata.role`'dan okunur (0028 trigger'ı yazar).
 * Rol YALNIZCA yönlendirme içindir; yetkinin tek kaynağı RLS'tir.
 * Token'da rol yoksa (migration öncesi ya da eski oturum) `coach`
 * varsayılır — bu güvenli: öğrenci hesabı koç arayüzüne düşse bile
 * RLS ona koçun verisini açmaz, yalnızca boş ekranlar görür.
 */
export type Role = "coach" | "student";

export const HOME_BY_ROLE: Record<Role, string> = {
  coach: "/koc/panel",
  student: "/ogrenci/bugun",
};

export function roleFromClaims(claims: unknown): Role {
  if (claims && typeof claims === "object") {
    const meta = (claims as { app_metadata?: { role?: unknown } }).app_metadata;
    if (meta?.role === "student") return "student";
  }
  return "coach";
}

/**
 * Giriş yapmış kullanıcının bu yola girip giremeyeceği; giremiyorsa
 * yönlendirileceği yer.
 *
 * - Öğrenci `/koc/*`'a giremez.
 * - Koç `/ogrenci/*`'a girebilir: orası onun için SALT OKUNUR önizleme
 *   (layout kararlaştırır).
 * - Kök `/` role göre ana sayfaya gider.
 */
export function routeFor(role: Role, pathname: string): string | null {
  if (pathname === "/") return HOME_BY_ROLE[role];
  if (role === "student" && (pathname === "/koc" || pathname.startsWith("/koc/"))) {
    return HOME_BY_ROLE.student;
  }
  if (pathname === "/koc") return HOME_BY_ROLE.coach;
  if (pathname === "/ogrenci") return HOME_BY_ROLE.student;
  return null;
}
