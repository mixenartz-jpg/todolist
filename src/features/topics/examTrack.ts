"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Exam, Topic } from "@/features/sources/types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

/*
 * Öğrencinin hazırlandığı sınav (0041, `profiles.exam_track`).
 *
 *   LGS  → yalnızca LGS konuları
 *   YKS  → TYT + AYT
 *   null → atanmadı; her şey görünür (eski davranış)
 */

export type ExamTrack = "LGS" | "YKS";

export const EXAM_TRACKS: readonly ExamTrack[] = ["LGS", "YKS"];

const TRACK_EXAMS: Record<ExamTrack, readonly Exam[]> = {
  LGS: ["LGS"],
  YKS: ["TYT", "AYT"],
};

/** Sınavın konu listesindeki sınav kodları; atanmadıysa null (hepsi). */
export function examsForTrack(track: ExamTrack | null): readonly Exam[] | null {
  return track ? TRACK_EXAMS[track] : null;
}

export function topicsForTrack(topics: readonly Topic[], track: ExamTrack | null): Topic[] {
  const exams = examsForTrack(track);
  return exams ? topics.filter((t) => exams.includes(t.exam)) : [...topics];
}

/** Adres çubuğundaki ders bu listede yoksa ilk ders. */
export function pickSubject(wanted: string | null, subjects: readonly string[]): string {
  return wanted !== null && subjects.includes(wanted) ? wanted : (subjects[0] ?? "");
}

/** Adres çubuğundaki sınav öğrencinin sınavında yoksa null (hepsi). */
export function pickExam(wanted: string | null, choices: readonly Exam[]): Exam | null {
  return choices.find((x) => x === wanted) ?? null;
}

/**
 * Öğrencinin sınavı. Sütun yoksa (0041 çalışmadı) ya da okunamazsa
 * null — ekran atanmamış gibi davranır, hata vermez.
 */
export function useExamTrack(studentId: string | null) {
  return useQuery({
    queryKey: qk.examTrack(studentId ?? "none"),
    enabled: studentId !== null,
    queryFn: async (): Promise<ExamTrack | null> => {
      const { data, error } = await createClient()
        .from("profiles")
        .select("exam_track")
        .eq("user_id", studentId!)
        .maybeSingle();
      if (error || !data) return null;
      const v = (data as { exam_track: string | null }).exam_track;
      return v === "LGS" || v === "YKS" ? v : null;
    },
  });
}

export function useSetExamTrack(studentId: string | null, onError?: (m: string) => void) {
  const qc = useQueryClient();
  const key = qk.examTrack(studentId ?? "none");
  return useMutation({
    mutationFn: async (track: ExamTrack | null) => {
      if (!studentId) throw new Error("Öğrenci seçilmedi");
      const { error } = await createClient().rpc("set_student_exam_track", { student: studentId, track });
      if (error) throw error;
    },
    onMutate: async (track) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ExamTrack | null>(key);
      qc.setQueryData(key, track);
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(key, ctx?.prev ?? null);
      onError?.(e instanceof Error ? e.message : "Sınav kaydedilemedi");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
