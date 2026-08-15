"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { CategoryRow, PlanGoalRow } from "@/lib/db/database.types";
import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";
import { toCategory, toPlanGoal } from "./queries";
import type {
  Category,
  CategoryDraft,
  MonthPlan,
  PlanGoal,
  PlanGoalDraft,
} from "./types";

/**
 * Kategori yazma hook'ları.
 *
 * Hepsi `tasks/mutations.ts`'in desenini izler: `cancelQueries` →
 * anlık görüntü → `setQueryData` yaması → hatada geri alma →
 * `onSettled`'da invalidate. Hatalar `onError` geri çağrısıyla
 * `useToast()`'a bağlanır.
 *
 * Oluşturma optimistic DEĞİL: kimliği sunucu üretiyor (uuid default)
 * ve geçici bir kimlikle yazıp sonra değiştirmek, o kimliğe bağlanmış
 * görev atamalarını bozardı. Kategori oluşturmak nadir bir iştir;
 * bir ağ turu beklemek kabul edilebilir.
 */

export function useCreateCategory(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (draft: CategoryDraft): Promise<Category> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: draft.name.trim(),
          color_slot: draft.colorSlot,
          // Sona ekle: mevcut sıra bozulmasın. Kaç kategori olduğunu
          // istemci zaten biliyor ama yarış olmasın diye sunucudan
          // okumak yerine basit bir zaman damgası mantığı kullanmak
          // gereksiz; sıra düzenlemesi ayrı bir iştir.
          sort_order: draft.sortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return toCategory(data as CategoryRow);
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

export function useRenameCategory(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("categories")
        .update({ name: name.trim() })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: qk.categories() });
      const previous = qc.getQueryData<Category[]>(qk.categories());
      qc.setQueryData<Category[]>(qk.categories(), (list) =>
        list?.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)),
      );
      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.categories(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.categories() }),
  });
}

export function useSetCategoryColor(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, colorSlot }: { id: string; colorSlot: number }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("categories")
        .update({ color_slot: colorSlot })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, colorSlot }) => {
      await qc.cancelQueries({ queryKey: qk.categories() });
      const previous = qc.getQueryData<Category[]>(qk.categories());
      qc.setQueryData<Category[]>(qk.categories(), (list) =>
        list?.map((c) => (c.id === id ? { ...c, colorSlot } : c)),
      );
      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.categories(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.categories() }),
  });
}

/**
 * Kategoriyi arşivler ya da arşivden çıkarır.
 *
 * SİLMEZ: silmek bağlı görevlerin `category_id`'sini null'a düşürür
 * (0008'deki `on delete set null`) ve geçmiş ay dağılımları geriye
 * dönük değişirdi — Mart'ın özeti bugün baktığında başka görünürdü.
 */
export function useArchiveCategory(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      archived,
    }: {
      id: string;
      archived: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("categories")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, archived }) => {
      await qc.cancelQueries({ queryKey: qk.categories() });
      const previous = qc.getQueryData<Category[]>(qk.categories());
      qc.setQueryData<Category[]>(qk.categories(), (list) =>
        list?.map((c) =>
          c.id === id
            ? { ...c, archivedAt: archived ? new Date().toISOString() : null }
            : c,
        ),
      );
      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.categories(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.categories() }),
  });
}

/**
 * Kategoriyi KALICI olarak siler.
 *
 * Bağlı görevler HAYATTA KALIR, yalnızca kategorisiz olurlar
 * (`on delete set null`). Arayüz arşivi öne çıkarır ama silme yolu da
 * bulunmalı: yanlışlıkla oluşturulmuş bir kategoriyi sonsuza kadar
 * arşivde taşımak gereksiz.
 *
 * `tasks` önbelleği de geçersiz kılınır: silinen kategoriye bağlı
 * görevlerin `categoryId`'si sunucuda null'a düştü ve önbellekte eski
 * değer kalırsa satırlarda hayalet bir renk noktası görünürdü.
 */
export function useDeleteCategory(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.categories() });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
    onError: (error) => onError?.(errorText(error)),
  });
}

/**
 * Görevin kategorisini ayarlar — optimistic.
 *
 * `useUpdateTask` DEĞİL: o `title`, `due_date` ve `note` alanlarını da
 * yazıyor ve önbellekten okunan değer bayatsa onları sessizce geri
 * alırdı (`useRenameTask`'ın doc-block'undaki aynı gerekçe). Dar
 * güncelleme yalnızca dokunduğu alanı riske atar.
 */
export function useSetTaskCategory(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      categoryId,
    }: {
      id: string;
      categoryId: string | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({ category_id: categoryId })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, categoryId }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());
      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, categoryId } : t)),
      );
      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.tasks(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks() }),
  });
}

/* ─────────────────────────── Aylık hedefler ────────────────────────── */

/**
 * Hedef mutation'ları AY BAŞINA anahtar geçersiz kılar
 * (`qk.planGoalsMonth`), tümünü değil: kullanıcı Ağustos'ta çalışırken
 * Temmuz'un önbelleğini tazelemenin anlamı yok ve önek eşleşmesiyle
 * hepsini birden atmak, geçmişe bakıp geri dönen kullanıcıya gereksiz
 * bir bekleme yaşatırdı.
 */
export function useCreateGoal(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (draft: PlanGoalDraft) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("plan_goals")
        .insert({
          month: draft.month,
          title: draft.title.trim(),
          note: draft.note,
          target_count: draft.targetCount,
          color_slot: draft.colorSlot,
          sort_order: draft.sortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return toPlanGoal(data as PlanGoalRow);
    },

    onSuccess: (goal) =>
      qc.invalidateQueries({ queryKey: qk.planGoalsMonth(goal.month) }),
    onError: (error) => onError?.(errorText(error)),
  });
}

interface UpdateGoalVars {
  id: string;
  month: DateStr;
  title: string;
  note: string | null;
  targetCount: number | null;
  colorSlot: number;
}

export function useUpdateGoal(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateGoalVars) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("plan_goals")
        .update({
          title: input.title.trim(),
          note: input.note,
          target_count: input.targetCount,
          color_slot: input.colorSlot,
        })
        .eq("id", input.id);
      if (error) throw error;
    },

    onMutate: async (vars) => {
      const key = qk.planGoalsMonth(vars.month);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PlanGoal[]>(key);

      qc.setQueryData<PlanGoal[]>(key, (list) =>
        list?.map((g) =>
          g.id === vars.id
            ? {
                ...g,
                title: vars.title.trim(),
                note: vars.note,
                targetCount: vars.targetCount,
                colorSlot: vars.colorSlot,
                /*
                 * Sayısal hedef KALDIRILDIYSA ilerleme sayacı da
                 * sıfırlanır. Kalsaydı, hedef tekrar sayısal yapıldığında
                 * kullanıcının hiç işaretlemediği eski bir ilerleme
                 * canlanırdı.
                 */
                doneCount: vars.targetCount === null ? 0 : g.doneCount,
              }
            : g,
        ),
      );

      return { previous, key };
    },

    onError: (error, _vars, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      onError?.(errorText(error));
    },

    onSettled: (_data, _error, vars) =>
      qc.invalidateQueries({ queryKey: qk.planGoalsMonth(vars.month) }),
  });
}

/** İlerleme sayacını bir adım oynatır — optimistic. */
export function useStepGoalProgress(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      doneCount,
    }: {
      id: string;
      month: DateStr;
      doneCount: number;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("plan_goals")
        .update({ done_count: doneCount })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async (vars) => {
      const key = qk.planGoalsMonth(vars.month);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PlanGoal[]>(key);

      qc.setQueryData<PlanGoal[]>(key, (list) =>
        list?.map((g) =>
          g.id === vars.id ? { ...g, doneCount: vars.doneCount } : g,
        ),
      );

      return { previous, key };
    },

    onError: (error, _vars, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      onError?.(errorText(error));
    },

    onSettled: (_data, _error, vars) =>
      qc.invalidateQueries({ queryKey: qk.planGoalsMonth(vars.month) }),
  });
}

/**
 * Hedefi arşivler ya da geri alır.
 *
 * `categories` ile aynı gerekçe: silmek bağlı görevlerin `goal_id`'sini
 * null'a düşürür ve geçmiş ay özeti geriye dönük değişir.
 */
export function useArchiveGoal(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      archived,
    }: {
      id: string;
      month: DateStr;
      archived: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("plan_goals")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },

    onSettled: (_data, _error, vars) =>
      qc.invalidateQueries({ queryKey: qk.planGoalsMonth(vars.month) }),
    onError: (error) => onError?.(errorText(error)),
  });
}

/**
 * Hedefi KALICI olarak siler.
 *
 * Bağlı görevler hayatta kalır, yalnızca hedefsiz olurlar
 * (`on delete set null`). `tasks` önbelleği de tazelenir ki satırlarda
 * hayalet bir hedef bağı kalmasın.
 */
export function useDeleteGoal(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; month: DateStr }) => {
      const supabase = createClient();
      const { error } = await supabase.from("plan_goals").delete().eq("id", id);
      if (error) throw error;
    },

    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.planGoalsMonth(vars.month) });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
    onError: (error) => onError?.(errorText(error)),
  });
}

/** Görevin bağlı olduğu hedefi ayarlar — `useSetTaskCategory`'nin ikizi. */
export function useSetTaskGoal(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      goalId,
    }: {
      id: string;
      goalId: string | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({ goal_id: goalId })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, goalId }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());
      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, goalId } : t)),
      );
      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.tasks(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks() }),
  });
}

/**
 * Ayın GENEL planını kaydeder.
 *
 * `notes/mutations.ts`'teki `useSaveDayPlan`'ın ayrı-tablo sürümü:
 * aynı "Kaydet düğmesi yok, yazdıkça kaydet" deseni, aynı boşalınca-sil
 * mantığı. Fark, tek satırlık bir tabloya yazması ve komşu sütun
 * çatışması olmaması — burada `plan`/`note`/`mood` gibi paylaşılan bir
 * satır yok, dolayısıyla kısmi geri alma gerekmiyor.
 */
export function useSaveMonthPlan(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ month, body }: { month: DateStr; body: string }) => {
      const supabase = createClient();
      const trimmed = body.trim();

      /*
       * Metin boşaldıysa satır SİLİNİR — `day_notes` ile aynı karar:
       * boş metin bir kayıt değildir ve saklamak, kullanıcının hiç
       * yazmadığı aylar için çöp satır biriktirmek olurdu.
       *
       * `body` sütunu `not null` olduğu için boş dize yazmak da
       * mümkündü; silmek tercih edildi ki "planı olan aylar" sorgusu
       * ileride gerekirse satır varlığına bakabilsin.
       */
      if (trimmed.length === 0) {
        const { error } = await supabase
          .from("month_plans")
          .delete()
          .eq("month", month);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("month_plans")
        .upsert({ month, body: trimmed }, { onConflict: "user_id,month" });
      if (error) throw error;
    },

    onMutate: async ({ month, body }) => {
      await qc.cancelQueries({ queryKey: qk.monthPlan(month) });
      const previous = qc.getQueryData<MonthPlan>(qk.monthPlan(month));

      qc.setQueryData<MonthPlan>(qk.monthPlan(month), { month, body });

      return { previous };
    },

    onError: (error, { month }, context) => {
      qc.setQueryData(qk.monthPlan(month), context?.previous);
      onError?.(errorText(error));
    },

    /*
     * `onSettled` / `invalidateQueries` YOK — bu, `useSaveDayPlan`'dan
     * BİLİNÇLİ sapmadır, unutulmuş bir satır değil.
     *
     * Orada invalidation ay ızgarasının nokta haritası içindi
     * (`notePlansMonth`): plan yazılınca hücredeki noktanın belirmesi
     * gerekiyordu. Burada öyle bir TÜREV veri yok — bu metni okuyan tek
     * yer, metni zaten optimistic olarak yazdığımız ekranın kendisi.
     *
     * Üstelik zararlı olurdu: kullanıcı yazmaya devam ediyorken gelen
     * bir refetch imleci ve son cümleyi geri sarardı
     * (notes/mutations.ts:116-118'deki aynı gerekçe).
     */
  });
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Kaydedilemedi, tekrar deneyin";
}
