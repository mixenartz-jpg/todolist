import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_COOKIE } from "./activeStudent";
import { roleFromClaims, type Role } from "./roles";
import { pickStudent, studentOptions, type ProfileRow, type StudentOption } from "./students";

/**
 * Sayfayı kim görüyor ve kimin verisine bakıyor.
 *
 * `studentId` ekranların "öğrenci verisi" sorgularının hedefi:
 * öğrencide kendisi; koçta SEÇİLİ öğrenci (çerez `kero_student`,
 * geçersizse/yoksa ilk bağlanan). Koçun henüz öğrencisi yoksa null.
 */
export interface Viewer {
  userId: string;
  role: Role;
  /** Öğrencinin koçu; koçta null. */
  coachId: string | null;
  studentId: string | null;
  studentName: string | null;
  /** Koçun bütün öğrencileri (bağlanma sırasıyla); öğrencide boş. */
  students: StudentOption[];
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
    .select("user_id, role, coach_id, display_name, created_at");

  if (error || !rows) {
    return { userId, role, coachId: null, studentId: null, studentName: null, students: [] };
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
      students: [],
    };
  }

  const students = studentOptions(profiles, userId);
  const wanted = (await cookies()).get(STUDENT_COOKIE)?.value;
  const selected = pickStudent(students, wanted);

  return {
    userId,
    role,
    coachId: null,
    studentId: selected?.id ?? null,
    studentName: selected?.name ?? null,
    students,
  };
}
