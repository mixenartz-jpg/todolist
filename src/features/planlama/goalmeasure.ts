/**
 * Bir hedefin ilerlemesi HANGİ kaynaktan okunur? — saf mantık.
 *
 * 0022 ile hedefin üçüncü bir ölçüm biçimi doğdu ve üç kaynağın
 * önceliği TEK BİR YERDE kararlaştırılmalı; yoksa hedef kartı bir
 * sayı, ağaç sayfası başka bir sayı gösterir ve kullanıcı hangisine
 * inanacağını bilemez.
 *
 * ── Öncelik: AĞAÇ > sayısal hedef > bağlı görevler > ölçüsüz ──
 * Kullanıcının kararı. Gerekçesi: bir hedefe ağaç kurmak, "bu hedefi
 * nasıl ölçeceğimi artık kalem kalem yazdım" demektir. O noktadan
 * sonra elle işaretlenen sayaç daha KABA bir tahmindir ve ikisini yan
 * yana göstermek iki farklı yüzde demekti.
 *
 * `goalProgress` (rollup.ts) SİLİNMEDİ, sarıldı: ağaçsız hedeflerin
 * doğru cevabı hâlâ o ve mevcut testleri yeşil kalıyor. Bu modül
 * yalnızca "önce hangisine bakılır" sorusunu cevaplıyor.
 *
 * ── Neden `GoalProgress` genişletilmedi? ──
 * `goalProgress` bir hedefi ve görev listesini alıyor; ağaç bilgisi
 * ona üçüncü bir parametre olarak eklenseydi, onu çağıran her yer
 * (buildMonthRollup dahil, ay özeti) ağacı da çekmek zorunda kalırdı.
 * Ay özeti hedeflerin ağacını umursamıyor — orada `goalProgress` hâlâ
 * doğru araç.
 */

import type { Task } from "@/features/tasks/types";
import { goalTreeProgress, treeRootRatio } from "./nodeprogress";
import { goalProgress } from "./rollup";
import type { GoalNode, PlanGoal } from "./types";

/**
 * Hedefin ilerlemesi ve NEREDEN okunduğu.
 *
 * Arayüz `kind`'a göre farklı metin yazıyor — bir yüzdeyi kaynağını
 * söylemeden göstermek, kullanıcının sayıya güvenememesi demek.
 */
export type GoalMeasure =
  | {
      kind: "tree";
      /** null → ağaç kurulu ama hiç görev dağıtılmamış (ölçülmüyor). */
      ratio: number | null;
      taskTotal: number;
      taskDone: number;
      /** Ağaçtaki düğüm sayısı — "7 başlık" diye yazmak için. */
      nodeCount: number;
    }
  | { kind: "count"; ratio: number; doneCount: number; targetCount: number }
  | { kind: "tasks"; ratio: number; taskTotal: number; taskDone: number }
  | { kind: "none" };

/**
 * Hedefin ilerlemesini önceliğe göre çözer.
 *
 * `nodes` YALNIZCA bu hedefin düğümleri olmalı, ama emin olmak için
 * yine de `planGoalId` ile süzülüyor: çağıran yanlış listeyi
 * geçirdiğinde hedef sessizce yanlış ölçüye kaymasın.
 */
export function goalMeasure(
  goal: PlanGoal,
  nodes: readonly GoalNode[],
  tasks: readonly Task[],
): GoalMeasure {
  const mine = nodes.filter((n) => n.planGoalId === goal.id);

  if (mine.length > 0) {
    const progress = goalTreeProgress(mine, tasks);

    let taskTotal = 0;
    let taskDone = 0;
    for (const node of mine) {
      if (node.parentId !== null) continue;
      const entry = progress.get(node.id);
      if (entry === undefined) continue;
      taskTotal += entry.taskTotal;
      taskDone += entry.taskDone;
    }

    return {
      kind: "tree",
      ratio: treeRootRatio(progress, mine),
      taskTotal,
      taskDone,
      nodeCount: mine.length,
    };
  }

  // Ağaç yok: eski davranış, harfi harfine. `goalProgress`'in kendi
  // öncelik sırası (sayısal hedef > görevler > ölçüsüz) burada
  // yeniden yazılmıyor, ondan okunuyor.
  const legacy = goalProgress(goal, tasks);

  if (legacy.source === "count") {
    return {
      kind: "count",
      // `goalProgress` zaten 1'e kırpıyor; burada tekrar etmiyoruz ki
      // kırpma kuralı tek yerde kalsın.
      ratio: legacy.ratio as number,
      doneCount: goal.doneCount,
      targetCount: goal.targetCount as number,
    };
  }

  if (legacy.source === "tasks") {
    return {
      kind: "tasks",
      ratio: legacy.ratio as number,
      taskTotal: legacy.taskTotal,
      taskDone: legacy.taskDone,
    };
  }

  return { kind: "none" };
}
