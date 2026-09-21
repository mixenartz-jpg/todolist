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
      const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());

      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, done } : t)),
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
 * Düz listede beklemek tolere edilebilirdi: satır en sona düşer ve
 * kullanıcı zaten oraya bakmıyordur. Zaman ızgarasında değil — 14:30'a
 * tıklayıp başlığı yazan kullanıcı, tam da baktığı yerde bir ağ turu
 * boyunca HİÇBİR ŞEY görmez. Bu, sürüklemenin akıcılığıyla tezat
 * oluşturur ve tıklamanın kaydedilmediği izlenimi verir.
 *
 * Geçici satır `tmp-` önekli bir kimlik taşır (bkz. daygrid/drop.ts).
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
          start_time: draft.startTime ?? null,
          // `useSetTaskTime` ile aynı kural: saatsiz süreye izin yok.
          // Kısıtı istemcide zorlamak, sunucudan hata almaya yeğdir.
          duration_minutes: draft.startTime ? (draft.durationMinutes ?? null) : null,
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
        // Sunucu `sort_order` varsayılanını kendi verir; burada 0
        // yeterli, çünkü sıralama zaten saate göre yapılıyor.
        sortOrder: 0,
        startTime: draft.startTime ?? null,
        durationMinutes: draft.startTime ? (draft.durationMinutes ?? null) : null,
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
 * (taskpopover/note.ts).
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
 * Görevin saatini ve süresini ayarlar — optimistic.
 *
 * `startTime` null verilirse süre de temizlenir: veritabanı kısıtı
 * saatsiz süreye izin vermez ("45 dakika ama ne zaman?" bir plan
 * değildir) ve bunu istemcide zorlamak, sunucudan kısıt hatası almaya
 * yeğdir.
 */
export function useSetTaskTime(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      startTime,
      durationMinutes,
    }: {
      id: string;
      startTime: string | null;
      durationMinutes: number | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({
          start_time: startTime,
          duration_minutes: startTime ? durationMinutes : null,
        })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, startTime, durationMinutes }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());
      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) =>
          t.id === id
            ? {
                ...t,
                startTime,
                durationMinutes: startTime ? durationMinutes : null,
              }
            : t,
        ),
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

const MOVE_KEY = ["moveTask"] as const;

/**
 * Görevi tek işlemde başka güne VE saate taşır — optimistic.
 *
 * ── Neden `useRescheduleTask` + `useSetTaskTime` DEĞİL? ──
 * Bir bırakma TEK kullanıcı hareketidir; iki mutasyon iki `onSettled`
 * ve iki `invalidateQueries` demektir. Biri diğeri uçarken dönerse
 * önbellek yarı-eski bir satırla ezilir ve blok bir kare eski yerine
 * zıplar. Daha kötüsü kısmi başarıdır: gün yazılıp saat yazılamazsa
 * görev doğru güne ama YANLIŞ saate yerleşir ve `onError`'daki geri
 * alma diğer mutasyonun yamasını da siler. Tek `update` her iki sütunu
 * atomik yazar.
 *
 * `useRescheduleTask` ve `useSetTaskTime` yerinde DURUYOR: "yarına
 * ertele" saatle ilgilenmez, "saati kaldır" günle. Dar mutasyon
 * yalnızca dokunduğu alanı riske atar (bkz. useRenameTask gerekçesi).
 */
export function useMoveTask(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: MOVE_KEY,

    mutationFn: async ({
      id,
      dueDate,
      startTime,
      durationMinutes,
    }: {
      id: string;
      dueDate: DateStr;
      startTime: string | null;
      durationMinutes: number | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({
          due_date: dueDate,
          start_time: startTime,
          duration_minutes: startTime ? durationMinutes : null,
        })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ id, dueDate, startTime, durationMinutes }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());

      qc.setQueryData<Task[]>(qk.tasks(), (tasks) =>
        tasks?.map((t) =>
          t.id === id
            ? {
                ...t,
                dueDate,
                startTime,
                durationMinutes: startTime ? durationMinutes : null,
              }
            : t,
        ),
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      qc.setQueryData(qk.tasks(), context?.previous);
      onError?.(errorText(error));
    },

    /*
     * Hızlı ardışık sürüklemelerde her bırakma ayrı bir refetch
     * tetiklemesin — `useToggleTask`'taki disiplinin aynısı.
     */
    onSettled: () => {
      if (qc.isMutating({ mutationKey: MOVE_KEY }) === 1) {
        qc.invalidateQueries({ queryKey: qk.tasks() });
      }
    },
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
