"use client";

import { useQuery } from "@tanstack/react-query";
import type { GoalNodeRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { GoalNode, NodeOwner } from "./types";

/**
 * Bir hedefin BÜTÜN ağacı — tek sorgu.
 *
 * `plan_goal_id` her satırda dolu olduğu için (0022) üç seviyenin
 * tamamı tek `eq` filtresiyle geliyor. Yalnızca kökler taşısaydı
 * özyinelemeli bir CTE gerekirdi — supabase-js onu ifade edemez — ya
 * da seviye başına bir ağ turu atılırdı.
 *
 * `owner` null olabilir: `/planlama` yan paneli hedef
 * seçilmeden monte oluyor ve o sırada sorgu hiç açılmamalı.
 *
 * ── Neden `useTasks` gibi "hepsini çek, bellekte filtrele" değil? ──
 * Düğümler yıllar boyunca birikir (her ay yeni hedefler, her hedefin
 * ağacı) ama ekran hep TEK hedefin ağacına bakıyor —
 * `usePlanGoals`'ın ay başına bölünme gerekçesinin aynısı.
 */
export function useGoalNodes(owner: NodeOwner | null) {
  return useQuery({
    queryKey: qk.goalNodesFor(owner?.id ?? ""),
    queryFn: () => fetchGoalNodes(owner as NodeOwner),
    enabled: owner !== null,
  });
}

/** Sahibin sütunu (0025): aylık ağaç `plan_goal_id`, haftalık `week_goal_id`. */
export function ownerColumn(owner: NodeOwner): "plan_goal_id" | "week_goal_id" {
  return owner.kind === "month" ? "plan_goal_id" : "week_goal_id";
}

async function fetchGoalNodes(owner: NodeOwner): Promise<GoalNode[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goal_nodes")
    .select("*")
    .eq(ownerColumn(owner), owner.id)
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
    // `?? null`: 0025 henüz çalıştırılmadıysa alan HİÇ gelmez.
    weekGoalId: row.week_goal_id ?? null,
    parentId: row.parent_id,
    depth: row.depth,
    title: row.title,
    note: row.note,
    sortOrder: row.sort_order,
    // `?? false`: 0024 henüz çalıştırılmadıysa alan HİÇ gelmez.
    repeating: row.repeating ?? false,
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
export function useGoalNodesFor(
  ownerIds: readonly string[],
  kind: NodeOwner["kind"] = "month",
) {
  // Anahtar sırayla değişmesin: aynı hedef kümesi farklı sırada
  // gelirse ikinci bir önbellek girdisi doğardı.
  const ids = [...ownerIds].sort();

  return useQuery({
    queryKey: qk.goalNodesMany(ids),
    queryFn: () => fetchGoalNodesFor(ids, kind),
    enabled: ids.length > 0,
  });
}

async function fetchGoalNodesFor(
  ownerIds: readonly string[],
  kind: NodeOwner["kind"],
): Promise<GoalNode[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("goal_nodes")
    .select("*")
    .in(kind === "month" ? "plan_goal_id" : "week_goal_id", ownerIds)
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as GoalNodeRow[]).map(toGoalNode);
}
