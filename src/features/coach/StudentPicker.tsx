"use client";

import { switchStudent } from "@/lib/auth/activeStudent";
import { useOptionalViewer } from "@/lib/auth/ViewerProvider";
import { cn } from "@/lib/ui/cn";

/**
 * Koçun hangi öğrenciye baktığı. Yalnızca 2+ öğrencide görünür; tek
 * öğrencide seçilecek bir şey yok, kabuk eskisi gibi kalır.
 *
 * Seçim değişince sayfa BAŞTAN yüklenir (`switchStudent`): önbellekteki
 * önceki öğrencinin satırları yeni öğrencinin ekranına bir an bile
 * sızmasın. Native `<select>`: mobilde sistemin seçicisi açılır.
 *
 * `rail`: masaüstü kenar çubuğu, tam genişlik. `compact`: mobil başlık.
 */
export function StudentPicker({ variant }: { variant: "rail" | "compact" }) {
  const viewer = useOptionalViewer();
  if (!viewer || viewer.role !== "coach" || viewer.students.length < 2) return null;

  return (
    <label className={cn("flex min-w-0 flex-col", variant === "rail" ? "mt-3 gap-1" : "max-w-[9.5rem]")}>
      <span
        className={cn(
          "text-[length:var(--text-2xs)] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-3)]",
          variant === "compact" && "sr-only",
        )}
      >
        Öğrenci
      </span>
      <select
        value={viewer.studentId ?? ""}
        onChange={(event) => {
          if (event.target.value && event.target.value !== viewer.studentId) switchStudent(event.target.value);
        }}
        className={cn(
          "w-full min-w-0 truncate rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 font-medium text-[var(--color-ink)]",
          variant === "rail" ? "h-8 text-[length:var(--text-sm)]" : "h-9 text-[length:var(--text-sm)]",
        )}
      >
        {viewer.students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
