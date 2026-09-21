"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { DateStr } from "@/lib/date/types";
import type { TaskRow } from "@/lib/db/database.types";
import {
  applySortOrders,
  type SortOrderPatch,
} from "@/features/planlama/reorder";
import { pendingTaskId } from "./pending";
import { toTask } from "./queries";
import type { Task, TaskDraft } from "./types";

const TOGGLE_KEY = ["toggleTask"] as const;

/**
 * Görevi tamamlandı/tamamlanmadı yapar — optimistic.
 *
 * Rutin hücreleriyle aynı disiplin: uçuştaki sorgular iptal edilir,
 * önbellek anında yamalanır, hata olursa anlık görüntü geri yüklenir.
 * Kutucuğa basınca beklemek, günlük kullanımı yorucu yapar.
 */
export function useToggleTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: TOGGLE_KEY,

    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        /*
         * Damga İŞARETLE BİRLİKTE yazılıyor, ayrı bir yazmayla değil:
         * iki tur arasında biri başarısız olursa "bitti ama ne zaman
         * bilinmiyor" ya da tersi bir satır kalırdı.
         *
         * Geri alındığında `null`: `done=false` olan bir satırda
         * damga kalsaydı "bitmemiş ama şu an bitmiş" diye çelişkili
         * bir kayıt olurdu ve arşiv onu yine de listelerdi.
         */
        .update({ done, completed_at: done ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());

      /*
       * İyimser damga İSTEMCİ saatinden. Sunucununkinden birkaç
       * milisaniye sapabilir ama arşiv GÜN çözünürlüğünde çalışıyor;
       * fark ancak gece yarısına saniyeler kala anlam taşır ve o
       * durumda da `onSettled`'ın tazelemesi doğruyu getirir.
       */
      const completedAt = done ? new Date().toISOString() : null;

      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, done, completedAt } : t)),
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.tasks(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => {
      if (qc.isMutating({ mutationKey: TOGGLE_KEY }) === 1) {
        qc.invalidateQueries({ queryKey: qk.tasks() });
      }
    },
  });
}

const CREATE_KEY = ["createTask"] as const;

/**
 * Yeni görev oluşturur — optimistic.
 *
 * ── Neden optimistic? ──
 * Hızlı ekleme kutusu ART ARDA yazmak için var: kullanıcı bir cümle
 * yazıp Enter'a basar ve hemen ikinciyi yazmaya başlar. Satır bir ağ
 * turu boyunca görünmezse, yazdığının kaydedilip kaydedilmediği
 * belirsiz kalır ve aynı görev iki kez girilir.
 *
 * Geçici satır `tmp-` önekli bir kimlik taşır (bkz. `pending.ts`).
 * O kimliğe yapılacak her yazma var olmayan bir satıra gideceği için
 * arayüz geçici görevleri etkileşime kapatır; `isPendingTask` bu
 * sözleşmenin tek kaynağıdır.
 */
export function useCreateTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: CREATE_KEY,

    mutationFn: async (draft: TaskDraft) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: draft.title.trim(),
          due_date: draft.dueDate,
          note: draft.note,
        })
        .select()
        .single();

      if (error) throw error;
      return toTask(data as TaskRow);
    },

    onMutate: async (draft) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());

      const optimistic: Task = {
        id: pendingTaskId(),
        title: draft.title.trim(),
        dueDate: draft.dueDate,
        done: false,
        note: draft.note,
        /*
         * Sunucu `sort_order` varsayılanını kendi verir; burada 0
         * yeterli. `orderForDay` eşitlikte `id`'ye düşüyor ve geçici
         * satırın `tmp-` kimliği listenin başına oturuyor — görev bir
         * an için yukarıda görünüp sunucu cevabıyla yerine kayabilir.
         * Kabul edilen bir kusur: alternatifi, sunucunun vereceği
         * sırayı istemcide tahmin etmeye çalışmaktı.
         */
        sortOrder: 0,
        // Yeni görev bitmemiş doğar; damga da yok.
        completedAt: null,
        categoryId: null,
        goalId: null,
        // Yeni görev rengini KATEGORİDEN devralır ve kategorisi de yok:
        // nötr çizilir. Renk sonradan verilen ikinci bir harekettir.
        colorSlot: null,
      };

      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks ? [...tasks, optimistic] : tasks,
      );

      return { previous };
    },

    onError: (error, _draft, context) => {
      qc.setQueryData(qk.tasks(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => {
      if (qc.isMutating({ mutationKey: CREATE_KEY }) === 1) {
        qc.invalidateQueries({ queryKey: qk.tasks() });
      }
    },
  });
}

export function useUpdateTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title: string;
      dueDate: DateStr | null;
      note: string | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({
          title: input.title.trim(),
          due_date: input.dueDate,
          note: input.note,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks() }),
    onError: (error) => onError?.(errorText(error)),
  });
}

export function useDeleteTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());
      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.filter((t) => t.id !== id),
      );
      return { previous };
    },

    onError: (error, _id, context) => {
      qc.setQueryData(qk.tasks(), context?.previous);
      onError?.(errorText(error));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks() }),
  });
}

/**
 * Görevin YALNIZCA adını değiştirir — optimistic.
 *
 * `useUpdateTask` varken neden ayrı bir hook? Çünkü o `due_date` ve
 * `note` alanlarını da yazıyor. Ad düzenleyen bir çağrı onları da
 * göndermek zorunda kalır ve önbellekten okunan değer bayatsa —
 * örneğin görev başka bir sekmede ertelendiyse — düzenleme o değişikliği
 * sessizce geri alırdı. Dar bir güncelleme yalnızca dokunduğu alanı
 * riske atar.
 *
 * Başlık burada da `.trim()` ediliyor: `normalizeTitleInput` çağrı
 * yerinde zaten kırpıyor ama bu hook'un tek başına da doğru olması,
 * ileride başka bir yerden çağrıldığında veritabanı kısıtına takılmayı
 * önler.
 */
export function useRenameTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({ title: title.trim() })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());
      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, title: title.trim() } : t)),
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
 * Görevin YALNIZCA açıklamasını yazar — optimistic.
 *
 * `useRenameTask`'ın ikizi ve aynı gerekçe: `useUpdateTask` `title` ve
 * `due_date`'i de gönderir; not düzenleyen bir popover, önbellekteki
 * bayat bir başlığı ya da tarihi sessizce geri yazardı.
 *
 * `null` bir SİLME emridir ve meşrudur: notu boşaltmak kullanıcının
 * yapabileceği bir harekettir. Bu yüzden `null` "yok say" anlamına
 * gelmez — o ayrım çağrı yerinde, `shouldPersistNote`'ta çözülür
 * (`tasks/note.ts`).
 */
export function useSetTaskNote(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string | null }) => {
      const supabase = createClient();
      const { error } = await supabase.from("tasks").update({ note }).eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, note }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());
      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, note } : t)),
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
 * Görevin KENDİ rengini ayarlar — optimistic.
 *
 * `null` burada da bir silme DEĞİL, bir DEVRALMA emridir: "kendi
 * rengini bırak, kategorininkini kullan". Çözüm sırası `taskColorSlot`
 * içinde (color.ts).
 */
export function useSetTaskColor(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      colorSlot,
    }: {
      id: string;
      colorSlot: number | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({ color_slot: colorSlot })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, colorSlot }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());
      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, colorSlot } : t)),
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

/** Görevi başka bir güne taşır (ör. "yarına ertele"). */
export function useRescheduleTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dueDate }: { id: string; dueDate: DateStr | null }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({ due_date: dueDate })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, dueDate }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());
      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, dueDate } : t)),
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
 * Gün içi sıralamayı yazar — optimistic.
 *
 * Yamalar `planReorder` ile hesaplanır (bkz. `planlama/reorder.ts`);
 * buraya yalnızca DEĞİŞEN satırlar gelir, tipik olarak iki tane.
 *
 * `upsert` DEĞİL, ayrı `update`'ler: upsert satırın tamamını ister ve
 * `user_id` göndermeyi gerektirir — oysa o sütunu trigger yalnızca
 * insert'te damgalıyor. Eksik gönderilen bir upsert mevcut satırı
 * ezerdi. Dizi küçük olduğu için paralel update'ler yeterli.
 */
export function useReorderTasks(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patches: readonly SortOrderPatch[]) => {
      if (patches.length === 0) return;

      const supabase = createClient();

      const results = await Promise.all(
        patches.map(({ id, sortOrder }) =>
          supabase.from("tasks").update({ sort_order: sortOrder }).eq("id", id),
        ),
      );

      // İlk hatayı fırlat: kısmi yazma olduysa `onSettled`'daki
      // invalidate sunucunun gerçek sırasını geri getirir.
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },

    onMutate: async (patches) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());

      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks && applySortOrders(tasks, patches),
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

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Kaydedilemedi, tekrar deneyin";
}
