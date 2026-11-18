import { createBrowserClient } from "@supabase/ssr";
import { activeStudentId, STUDENT_HEADER } from "@/lib/auth/activeStudent";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Tarayıcı tarafı Supabase istemcisi.
 *
 * Her isteğe koçun seçili öğrencisi başlık olarak eklenir; veritabanı
 * yeni satırın öğrencisini buradan alır (0039 `scope_student`). Başlık
 * İSTEK ANINDA okunur — `createBrowserClient` tekil istemci döndürür,
 * oluşturulduğu andaki değeri dondurmak yanlış olurdu.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey(), {
    global: { fetch: fetchWithStudent },
  });
}

function fetchWithStudent(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const student = activeStudentId();
  if (!student) return fetch(input, init);
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  headers.set(STUDENT_HEADER, student);
  return fetch(input, { ...init, headers });
}
