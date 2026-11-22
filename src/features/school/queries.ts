"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activeStudentId, forActiveStudent } from "@/lib/auth/activeStudent";
import { asDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { TopicSchoolStatusRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { SchoolMark, SchoolStatus } from "./school";

/** Etkin öğrencinin okul durumu işaretleri, konu kimliğine göre. */
export function useSchoolStatus() {
  return useQuery({
    queryKey: qk.schoolStatus(),
    queryFn: async (): Promise<Map<string, SchoolMark>> => {
      const { data, error } = await forActiveStudent(createClient().from("topic_school_status").select("*"));
      if (error) throw error;
      return new Map(
        (data as TopicSchoolStatusRow[]).map((r) => [
          r.topic_id,
          { topicId: r.topic_id, status: r.status, coveredOn: r.covered_on ? asDateStr(r.covered_on) : null },
        ]),
      );
    },
  });
}

/**
 * Konunun okul durumunu yaz. `status: null` → işaret kalkar
 * ("İşlenmedi"). İyimser: rozet anında değişir.
 */
export function useSetSchoolStatus(onError?: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { topicId: string; status: SchoolStatus | null; coveredOn: DateStr | null }) => {
      const supabase = createClient();
      const student = activeStudentId();
      if (input.status === null) {
        const { error } = await forActiveStudent(
          supabase.from("topic_school_status").delete().eq("topic_id", input.topicId),
        );
        if (error) throw error;
        return;
      }
      // Güncelle, satır yoksa ekle: tekil anahtarın `coach_id`'si trigger'da
      // damgalanıyor, istemci bilmiyor; `upsert`in çakışma sütunlarına gerek kalmasın.
      const upd = await forActiveStudent(
        supabase
          .from("topic_school_status")
          .update({ status: input.status, covered_on: input.coveredOn, updated_at: new Date().toISOString() })
          .eq("topic_id", input.topicId),
      ).select("id");
      if (upd.error) throw upd.error;
      if (upd.data.length > 0) return;
      const { error } = await supabase.from("topic_school_status").insert({
        topic_id: input.topicId,
        status: input.status,
        covered_on: input.coveredOn,
        ...(student ? { student_id: student } : {}),
      });
      if (error) throw error;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.schoolStatus() });
      const prev = qc.getQueryData<Map<string, SchoolMark>>(qk.schoolStatus());
      qc.setQueryData<Map<string, SchoolMark>>(qk.schoolStatus(), (m) => {
        const next = new Map(m ?? []);
        if (input.status === null) next.delete(input.topicId);
        else next.set(input.topicId, { topicId: input.topicId, status: input.status, coveredOn: input.coveredOn });
        return next;
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(qk.schoolStatus(), ctx?.prev);
      onError?.(e instanceof Error ? e.message : "Kaydedilemedi");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.schoolStatus() }),
  });
}
