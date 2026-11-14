import { createClient } from "@/lib/supabase/server";
import { roleFromClaims, type Role } from "./roles";

/**
 * Sayfayı kim görüyor ve kimin verisine bakıyor.
 *
 * `studentId` ekranların "öğrenci verisi" sorgularının hedefi:
 * öğrencide kendisi, koçta bağlı İLK öğrenci (şu an tek öğrenci var;
 * şema çoğuna hazır). Koçun henüz öğrencisi yoksa null.
 */
export interface Viewer {
  userId: string;
  role: Role;
  /** Öğrencinin koçu; koçta null. */
  coachId: string | null;
  studentId: string | null;
  studentName: string | null;
}

interface ProfileRow {
  user_id: string;
  role: Role;
  coach_id: string | null;
  display_name: string | null;
}

export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const userId = claims.sub;
  let role = roleFromClaims(claims);

  /*
   * Profil satırları: benimki + (koçsam) öğrencilerim. Tablo henüz
   * yoksa (0028 çalıştırılmadı) sorgu hata verir; o durumda eski
   * tek kullanıcılı davranışa düşülür.
   */
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("user_id, role, coach_id, display_name");

  if (error || !rows) {
    return { userId, role, coachId: null, studentId: null, studentName: null };
  }

  const profiles = rows as ProfileRow[];
  const me = profiles.find((p) => p.user_id === userId);
  // Veritabanı JWT'den daha taze olabilir (rol yeni değişti).
  if (me) role = me.role;

  if (role === "student") {
    return {
      userId,
      role,
      coachId: me?.coach_id ?? null,
      studentId: userId,
      studentName: me?.display_name ?? null,
    };
  }

  const student = profiles.find((p) => p.coach_id === userId && p.role === "student");
  return {
    userId,
    role,
    coachId: null,
    studentId: student?.user_id ?? null,
    studentName: student?.display_name ?? null,
  };
}
