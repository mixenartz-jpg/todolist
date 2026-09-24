"use client";

import { useQuery } from "@tanstack/react-query";
import type { GoalNodeRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { GoalNode } from "./types";

/**
 * Bir hedefin BÜTÜN ağacı — tek sorgu.
 *
 * `plan_goal_id` her satırda dolu olduğu için (0022) üç seviyenin
 * tamamı tek `eq` filtresiyle geliyor. Yalnızca kökler taşısaydı
 * özyinelemeli bir CTE gerekirdi — supabase-js onu ifade edemez — ya
 * da seviye başına bir ağ turu atılırdı.
 *
 * `planGoalId` null olabilir: `/planlama` yan paneli hedef
 * seçilmeden monte oluyor ve o sırada sorgu hiç açılmamalı.
 *
 * ── Neden `useTasks` gibi "hepsini çek, bellekte filtrele" değil? ──
 * Düğümler yıllar boyunca birikir (her ay yeni hedefler, her hedefin
 * ağacı) ama ekran hep TEK hedefin ağacına bakıyor —
 * `usePlanGoals`'ın ay başına bölünme gerekçesinin aynısı.
 */
export function useGoalNodes(planGoalId: string | null) {
  return useQuery({
    queryKey: qk.goalNodesFor(planGoalId ?? ""),
    queryFn: () => fetchGoalNodes(planGoalId as string),
    enabled: planGoalId !== null,
  });
}

async function fetchGoalNodes(planGoalId: string): Promise<GoalNode[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goal_nodes")
    .select("*")
    .eq("plan_goal_id", planGoalId)
    // Index ile aynı sıra (goal_nodes_user_goal_idx): kökler önce,
    // sonra kardeş sırası. `buildGoalTree` yine de kendi sıralamasını
    // yapıyor çünkü iyimser güncellemeler araya satır sokabiliyor.
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as GoalNodeRow[]).map(toGoalNode);
}

export function toGoalNode(row: GoalNodeRow): GoalNode {
  return {
    id: row.id,
    planGoalId: row.plan_goal_id,
    parentId: row.parent_id,
    depth: row.depth,
    title: row.title,
    note: row.note,
    sortOrder: row.sort_order,
  };
}

/**
 * Verilen hedeflerin TÜM ağaçları — tek sorgu.
 *
 * Hedefler ekranı her kartın yüzdesini ağaçtan okumak zorunda
 * ("ağaç varsa ağaç kazanır", goalmeasure.ts) ama kart başına
 * `useGoalNodes` açmak, on hedefli bir ayda on ağ turu demekti —
 * bu depodaki sorgu disiplinine aykırı.
 *
 * `in` filtresi hepsini bir turda getiriyor. Sonuç, `useGoalNodes`'un
 * hedef başına anahtarına YAZILMIYOR: iki farklı anahtarda aynı
 * satırların durması, birini tazeleyip diğerini bayat bırakma riski
 * doğururdu. Ağaç sayfası kendi sorgusunu açar; o sayfa tek hedefe
 * bakıyor ve maliyeti tek tur.
 *
 * Boş liste sorgu AÇMAZ: ayın hiç hedefi yoksa sorulacak bir şey yok.
 */
export function useGoalNodesFor(planGoalIds: readonly string[]) {
  // Anahtar sırayla değişmesin: aynı hedef kümesi farklı sırada
  // gelirse ikinci bir önbellek girdisi doğardı.
  const ids = [...planGoalIds].sort();

  return useQuery({
    queryKey: qk.goalNodesMany(ids),
    queryFn: () => fetchGoalNodesFor(ids),
    enabled: ids.length > 0,
  });
}

async function fetchGoalNodesFor(
  planGoalIds: readonly string[],
): Promise<GoalNode[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goal_nodes")
    .select("*")
    .in("plan_goal_id", planGoalIds)
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as GoalNodeRow[]).map(toGoalNode);
}
