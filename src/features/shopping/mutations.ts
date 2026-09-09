"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ShoppingItemRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import { toShoppingItem } from "./queries";
import type { ShoppingItem, ShoppingItemDraft } from "./types";

/**
 * Yeni kalem ekler.
 *
 * Optimistic DEĞİL — `useCreateWeekGoal` ile aynı gerekçe: kimliği
 * sunucu üretiyor ve geçici bir kimlikle satır çizmek, o satırın
 * işaretlenip silinebildiği ama henüz gerçek olmadığı bir aralık
 * açardı. Liste kısa ve ekleme tek satırlık; bekleme görünür bile
 * olmuyor.
 */
export function useCreateShoppingItem(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (draft: ShoppingItemDraft) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("shopping_items")
        .insert({
          // Başlık çağıran tarafta `normalizeTitleInput` ile
          // kırpılıyor; buradaki `trim` son savunma (0015'in check
          // kısıtı boş başlığı reddeder).
          title: draft.title.trim(),
          sort_order: draft.sortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return toShoppingItem(data as ShoppingItemRow);
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: qk.shoppingItems() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

/**
 * Kalemi alındı/alınmadı olarak işaretler — optimistic.
 *
 * Zaman damgası İSTEMCİDE üretilir ve `onMutate` ile aynı değeri
 * yazar. Sunucuya `now()` yazdırmak daha doğru bir saat verirdi ama
 * o zaman iyimser değer ile sunucudan dönen değer ayrışır, satır
 * yanıt gelince ikinci kez yerleşirdi — `useToggleWeekGoalDone` de
 * aynı kararı veriyor. Bu alanın gösterimde kullanılmadığı (yalnızca
 * null olup olmadığına bakılıyor) için sapma görünür değil.
 */
export function useToggleShoppingItem(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      completedAt,
    }: {
      id: string;
      completedAt: string | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("shopping_items")
        .update({ completed_at: completedAt })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async (vars) => {
      const key = qk.shoppingItems();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ShoppingItem[]>(key);

      qc.setQueryData<ShoppingItem[]>(key, (list) =>
        list?.map((i) =>
          i.id === vars.id ? { ...i, completedAt: vars.completedAt } : i,
        ),
      );

      return { previous, key };
    },

    onError: (error, _vars, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.shoppingItems() }),
  });
}

/** Kalemi siler — optimistic, `useDeleteWeekGoal` ile aynı desen. */
export function useDeleteShoppingItem(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("shopping_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async (id) => {
      const key = qk.shoppingItems();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ShoppingItem[]>(key);

      qc.setQueryData<ShoppingItem[]>(key, (list) =>
        list?.filter((i) => i.id !== id),
      );

      return { previous, key };
    },

    onError: (error, _id, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.shoppingItems() }),
  });
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Kaydedilemedi, tekrar deneyin";
}
