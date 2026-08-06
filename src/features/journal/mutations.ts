"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NoteRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import { toNote } from "./queries";
import type { Note, NoteDraft } from "./types";

export function useCreateNote(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (draft: NoteDraft) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notes")
        .insert({
          title: normalizeTitle(draft.title),
          body: draft.body.trim(),
          date: draft.date,
        })
        .select()
        .single();

      if (error) throw error;
      return toNote(data as NoteRow);
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: qk.journal() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

export function useUpdateNote(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: NoteDraft }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("notes")
        .update({
          title: normalizeTitle(draft.title),
          body: draft.body.trim(),
          date: draft.date,
        })
        .eq("id", id);

      if (error) throw error;
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: qk.journal() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

/**
 * Notu siler — optimistic.
 *
 * Görev silmeyle aynı disiplin: uçuştaki sorgular iptal edilir,
 * önbellek anında yamalanır, hata olursa anlık görüntü geri yüklenir.
 */
export function useDeleteNote(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.journal() });
      const previous = qc.getQueryData<Note[]>(qk.journal());

      qc.setQueryData<Note[]>(qk.journal(), (notes) =>
        notes?.filter((n) => n.id !== id),
      );

      return { previous };
    },

    onError: (error, _id, context) => {
      qc.setQueryData(qk.journal(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.journal() }),
  });
}

/** Boş ya da yalnızca boşluktan oluşan başlık null olarak saklanır. */
function normalizeTitle(title: string | null): string | null {
  const trimmed = title?.trim();
  return trimmed ? trimmed : null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Kaydedilemedi, tekrar deneyin";
}
