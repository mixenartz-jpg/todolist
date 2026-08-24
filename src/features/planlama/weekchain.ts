/**
 * Haftalık hedefleri, hizmet ettikleri aylık hedefe göre gruplar.
 *
 * 0014'ün getirdiği `week_goals.plan_goal_id` bağını okunabilir hâle
 * getiren tek yer burasıdır: "bu ay kitabı bitir" hedefinin altında,
 * hangi haftalarda hangi dilimlerin yazıldığı.
 *
 * ── Bu bir SAYAÇ DEĞİL ──
 * Harita yalnızca gruplama yapar; aylık hedefin ilerlemesini
 * DEĞİŞTİRMEZ. `goalProgress()` (rollup.ts) hâlâ ya kendi sayacına ya
 * da bağlı GÖREVLERE bakar. Haftalık dilimleri üçüncü bir ilerleme
 * kaynağı yapmak, aynı işi iki kez saymak olurdu — 0014'ün
 * `tasks.week_goal_id`'yi reddetme gerekçesinin aynısı, bir katman
 * yukarıda.
 *
 * ── Sıra neden korunuyor? ──
 * Girdi sırası ekranın çizdiği sıradır (`week_goals_user_week_idx`:
 * sort_order, sonra created_at). Burada yeniden sıralamak, kullanıcının
 * Haftalık ekranında gördüğü listeyle Özet'te gördüğü listenin
 * ayrışması demekti.
 */

import type { WeekGoal } from "./types";

/**
 * Aylık hedef kimliğinden, ona bağlı haftalık hedeflere.
 *
 * Bağımsız haftalık hedefler (`planGoalId === null`) haritada HİÇ yer
 * almaz: onlar bir dilim değil, kendi başına bir hedeftir.
 */
export function weekSlicesByGoal(
  weekGoals: readonly WeekGoal[],
): Map<string, WeekGoal[]> {
  const out = new Map<string, WeekGoal[]>();

  for (const goal of weekGoals) {
    if (goal.planGoalId === null) continue;

    const bucket = out.get(goal.planGoalId);
    if (bucket === undefined) {
      out.set(goal.planGoalId, [goal]);
    } else {
      bucket.push(goal);
    }
  }

  return out;
}
