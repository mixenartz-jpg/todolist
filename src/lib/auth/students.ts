import type { Role } from "./roles";

export interface StudentOption {
  id: string;
  name: string;
}

export interface ProfileRow {
  user_id: string;
  role: Role;
  coach_id: string | null;
  display_name: string | null;
  created_at: string;
}

/**
 * Koçun öğrencileri, bağlanma sırasıyla (veritabanındaki
 * `first_student_of` ile aynı sıra). Adı girilmemiş öğrenci sırasıyla
 * adlandırılır.
 */
export function studentOptions(profiles: readonly ProfileRow[], coachId: string): StudentOption[] {
  return profiles
    .filter((p) => p.coach_id === coachId && p.role === "student")
    .sort((a, b) =>
      a.created_at === b.created_at ? (a.user_id < b.user_id ? -1 : 1) : a.created_at < b.created_at ? -1 : 1,
    )
    .map((p, i) => ({ id: p.user_id, name: p.display_name?.trim() || `Öğrenci ${i + 1}` }));
}

/** Çerezdeki seçim hâlâ benim öğrencimse o; değilse ilk öğrenci. */
export function pickStudent(students: readonly StudentOption[], wanted: string | undefined): StudentOption | null {
  return students.find((s) => s.id === wanted) ?? students[0] ?? null;
}
