"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { GoalNodeRow } from "@/lib/db/database.types";
import type { Task } from "@/features/tasks/types";
import { pendingTaskId } from "@/features/tasks/pending";
import type { NodeTaskDraft } from "./distribute";
import { toGoalNode } from "./nodeQueries";
import type { SortOrderPatch } from "./reorder";
import { subtreeIds } from "./tree";
import type { GoalNode, GoalNodeDraft } from "./types";

/**
 * Hedef ağacı yazma hook'ları (0022).
 *
 * ── Neden `mutations.ts`'e eklenmedi? ──
 * O dosya zaten 800 satırı aşmış ve üç varlığı (kategori, aylık hedef,
 * haftalık hedef) kapsıyor. Dördüncüsü onu 1000'in üstüne çıkarır ve
 * düğüm hook'larını bulunamaz hâle getirirdi. `tasks/mutations.ts`'in
 * ayrı durması da aynı emsal.
 *
 * Desen `mutations.ts` ile birebir aynı: `cancelQueries` → anlık
 * görüntü → `setQueryData` yaması → hatada geri alma → `onSettled`'da
 * invalidate. Her hook `onError` geri çağrısıyla `useToast()`'a
 * bağlanır.
 *
 * ── Her hook neden `planGoalId` taşıyor? ──
 * Yazmak için değil — sunucu onu satırdan zaten biliyor. Geçersiz
 * kılma anahtarı hedef başına bölünmüş (`qk.goalNodesFor`) ve
 * `onSettled` doğru ağacı tazelemek için hedefi bilmek zorunda.
 * `useUpdateGoal`'un `month` taşımasıyla aynı.
 */

/**
 * Yeni düğüm.
 *
 * ── İyimser DEĞİL ──
 * `useCreateCategory`/`useCreateGoal` ile aynı gerekçe, ama burada
 * daha ağır: kimliği SUNUCU üretiyor (uuid default) ve `depth`'i de
 * sunucu türetiyor (trigger). Geçici kimlikli bir düğüm, altına
 * çocuk eklenebilen bir şey olurdu ve o çocuğun `parent_id`'si var
 * olmayan bir `tmp-` kimliğe işaret ederdi.
 *
 * Başlık eklemek nadir bir iş; bir ağ turu beklemek kabul edilebilir.
 */
export function useCreateGoalNode(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (draft: GoalNodeDraft) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("goal_nodes")
        .insert({
          plan_goal_id: draft.planGoalId,
          parent_id: draft.parentId,
          title: draft.title.trim(),
          note: draft.note,
          sort_order: draft.sortOrder,
          // `depth` GÖNDERİLMİYOR: trigger ebeveynden türetiyor (0022).
          // İstemcinin yazacağı bir derinlik, ebeveyni görmediği için
          // yanlış olabilirdi.
        })
        .select()
        .single();

      if (error) throw error;
      return toGoalNode(data as GoalNodeRow);
    },

    onError: (error) => onError?.(errorText(error)),

    onSettled: (_data, _error, draft) => invalidateTree(qc, draft.planGoalId),
  });
}

/**
 * Düğümün yazılabilir alanlarını (başlık + not) değiştir — iyimser.
 *
 * ── Neden ikisi TEK yazmada? ──
 * Düzenleme formu ikisini birden topluyor. Ayrı hook'lar olsaydı
 * (önce böyleydi) çağıranın birini atlaması, kullanıcının yazdığı
 * notun sessizce düşmesi demek olurdu — ve tam olarak bu oldu.
 * Tek yama ayrıca tek geri alma noktası veriyor: not kaydedilip
 * başlık başarısız olamaz.
 *
 * Çağıran `nodeEdit()` (tree.ts) ile ne yazılacağına karar veriyor;
 * o fonksiyon geçersiz başlıkta ve değişiklik yokken `null` döner.
 */
export function useEditGoalNode(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      note,
    }: NodeFieldVars & { title: string; note: string | null }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("goal_nodes")
        .update({ title: title.trim(), note })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ planGoalId, id, title, note }) => {
      const key = qk.goalNodesFor(planGoalId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<GoalNode[]>(key);

      qc.setQueryData<GoalNode[]>(key, (list) =>
        list?.map((n) =>
          n.id === id ? { ...n, title: title.trim(), note } : n,
        ),
      );

      return { previous, key };
    },

    onError: (error, _vars, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      onError?.(errorText(error));
    },

    onSettled: (_data, _error, vars) => invalidateTree(qc, vars.planGoalId),
  });
}

/**
 * Düğümü ve TÜM ALTINI sil.
 *
 * İyimser silme `subtreeIds()` ile tüm dalı önbellekten çıkarıyor —
 * sunucudaki `on delete cascade` (0022) aynı işi yapıyor. Yalnızca
 * düğümün kendisi kaldırılsaydı çocukları bir an için yetim
 * görünürdü; `buildGoalTree` onları atardı ama önce bir kare boyunca
 * ağaç yanlış çizilirdi.
 *
 * `qk.tasks()` DE tazeleniyor: sunucu o düğümden doğmuş görevlerin
 * `node_id`'sini null'a çekiyor (`on delete set null`). Görevlerin
 * kendisi SİLİNMİYOR — tamamlanmış geçmiş korunuyor.
 */
export function useDeleteGoalNode(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: NodeFieldVars) => {
      const supabase = createClient();
      const { error } = await supabase.from("goal_nodes").delete().eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ planGoalId, id }) => {
      const key = qk.goalNodesFor(planGoalId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<GoalNode[]>(key);

      if (previous) {
        const doomed = new Set(subtreeIds(previous, id));
        qc.setQueryData<GoalNode[]>(
          key,
          previous.filter((n) => !doomed.has(n.id)),
        );
      }

      return { previous, key };
    },

    onError: (error, _vars, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      onError?.(errorText(error));
    },

    onSettled: (_data, _error, vars) => {
      invalidateTree(qc, vars.planGoalId);
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
  });
}

/**
 * Düğümü başka bir ebeveynin altına taşı.
 *
 * Çağıran ÖNCE `canMoveNode()` çağırmalı (tree.ts). Veritabanı da
 * reddederdi ama reddedilen bir ağ turu, devre dışı bir seçenekten
 * çok daha kötü bir deneyim.
 *
 * `depth` iyimser olarak yazılMAZ: sunucu türetiyor ve çocuklu bir dal
 * taşındığında torunların derinliğini de yayıyor
 * (`cascade_goal_node_depth`). İstemcide taklit etmek, aynı mantığı
 * iki yerde tutmak olurdu. `buildGoalTree` zaten `parentId`'den
 * çalışıyor, `depth`'ten değil — bu yüzden ağaç invalidate'e kadar
 * doğru çizilir.
 */
export function useMoveGoalNode(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      parentId,
      sortOrder,
    }: NodeFieldVars & { parentId: string | null; sortOrder: number }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("goal_nodes")
        .update({ parent_id: parentId, sort_order: sortOrder })
        .eq("id", id);
      if (error) throw error;
    },

    onMutate: async ({ planGoalId, id, parentId, sortOrder }) => {
      const key = qk.goalNodesFor(planGoalId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<GoalNode[]>(key);

      qc.setQueryData<GoalNode[]>(key, (list) =>
        list?.map((n) => (n.id === id ? { ...n, parentId, sortOrder } : n)),
      );

      return { previous, key };
    },

    onError: (error, _vars, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      onError?.(errorText(error));
    },

    onSettled: (_data, _error, vars) => invalidateTree(qc, vars.planGoalId),
  });
}

/** Kardeş sırasını yaz — `useReorderTasks` klonu. */
export function useReorderGoalNodes(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patches,
    }: {
      planGoalId: string;
      patches: readonly SortOrderPatch[];
    }) => {
      if (patches.length === 0) return;

      const supabase = createClient();

      const results = await Promise.all(
        patches.map(({ id, sortOrder }) =>
          supabase.from("goal_nodes").update({ sort_order: sortOrder }).eq("id", id),
        ),
      );

      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },

    onMutate: async ({ planGoalId, patches }) => {
      const key = qk.goalNodesFor(planGoalId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<GoalNode[]>(key);

      const byId = new Map(patches.map((p) => [p.id, p.sortOrder]));

      qc.setQueryData<GoalNode[]>(key, (list) =>
        list?.map((n) =>
          byId.has(n.id) ? { ...n, sortOrder: byId.get(n.id) as number } : n,
        ),
      );

      return { previous, key };
    },

    onError: (error, _vars, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      onError?.(errorText(error));
    },

    onSettled: (_data, _error, vars) => invalidateTree(qc, vars.planGoalId),
  });
}

/**
 * Düğümleri günlere dağıt — görev doğur.
 *
 * ── Bu, İYİMSER OLMASI GEREKEN tek create ──
 * `useCreateTask`'ın emsali birebir geçerli: kullanıcı bir düğümü bir
 * güne bırakıyor ve oraya DÜŞTÜĞÜNÜ görmeli. Sunucu cevabını beklemek,
 * sürükle-bırakı bozuk hissettirirdi. Geçici satırlar `tmp-` kimliğiyle
 * doğuyor ve `isPendingTask` onları arayüzde devre dışı bırakıyor.
 *
 * Tek `insert([...])` toplu çağrı: on kalemlik bir dağıtım on ağ turu
 * olmamalı.
 *
 * ── Neden yalnızca `qk.tasks()` tazeleniyor? ──
 * Dağıtım düğüm SATIRLARINI değiştirmiyor, yalnızca yeni görevler
 * doğuruyor. Ağacın ilerlemesi zaten istemcide `useTasks()`'tan
 * türetiliyor (nodeprogress.ts), yani görev listesi tazelenince ağaç
 * yüzdeleri kendiliğinden güncelleniyor. Ağaç anahtarını da tazelemek
 * bedava olmayan, hiçbir şey değiştirmeyen bir ağ turu olurdu.
 */
export function useDistributeNodes(onError?: (message: string) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ drafts }: { drafts: readonly NodeTaskDraft[] }) => {
      if (drafts.length === 0) return;

      const supabase = createClient();

      const { error } = await supabase.from("tasks").insert(
        drafts.map((draft) => ({
          title: draft.title.trim(),
          due_date: draft.dueDate,
          note: null,
          goal_id: draft.goalId,
          node_id: draft.nodeId,
          // Yalnız VARSA yazılır — `useCreateTask` ile aynı desen.
          ...(draft.estimateMinutes != null && {
            estimate_minutes: draft.estimateMinutes,
          }),
        })),
      );

      if (error) throw error;
    },

    onMutate: async ({ drafts }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      const previous = qc.getQueryData<Task[]>(qk.tasks());

      const optimistic: Task[] = drafts.map((draft) => ({
        id: pendingTaskId(),
        title: draft.title.trim(),
        dueDate: draft.dueDate,
        done: false,
        note: null,
        // Sunucu `sort_order` varsayılanını kendi verir; 0 yeterli.
        // `orderForDay` eşitlikte kimliğe düşüyor.
        sortOrder: 0,
        completedAt: null,
        categoryId: null,
        goalId: draft.goalId,
        nodeId: draft.nodeId,
        colorSlot: null,
        estimateMinutes: draft.estimateMinutes ?? null,
      }));

      qc.setQueryData<Task[]>(qk.tasks(), (tasks) => [
        ...(tasks ?? []),
        ...optimistic,
      ]);

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
 * Bir hedefin ağacını tazeler — HER İKİ anahtarı birden.
 *
 * `goalNodesFor(id)` ağaç sayfasının sorgusu; `goalNodesMany([...])`
 * ise Hedefler ekranının toplu sorgusu ve ikisi AYNI satırları farklı
 * anahtarlarda tutuyor. Yalnızca birini tazelemek, diğerini bayat
 * bırakır: kullanıcı ağaç sayfasında bir başlık ekleyip hedef
 * listesine dönünce eski yüzdeyi görürdü.
 *
 * Toplu anahtar tek tek bilinemez (hangi hedef kümeleri önbellekte
 * duruyor belli değil), bu yüzden ÖNEK ile tazeleniyor —
 * `goal-nodes` altındaki her şey. Burada önek eşleşmesi tam olarak
 * istenen işi yapıyor (`notePlansMonth` ile aynı yön).
 */
function invalidateTree(
  qc: ReturnType<typeof useQueryClient>,
  planGoalId: string,
): void {
  qc.invalidateQueries({ queryKey: qk.goalNodesFor(planGoalId) });
  qc.invalidateQueries({ queryKey: qk.goalNodes() });
}

/** Tek düğüme dokunan her yazmanın ortak değişkenleri. */
interface NodeFieldVars {
  /** Geçersiz kılma anahtarı için — yazılmıyor. */
  planGoalId: string;
  id: string;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Kaydedilemedi, tekrar deneyin";
}
