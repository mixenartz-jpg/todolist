/**
 * Plan düğümlerini günlere dağıtma — saf mantık.
 *
 * Ağacın asıl amacı bu: yazılmış bir plan, takvime düşmediği sürece
 * dilek olarak kalıyor. Bu modül "şu kalemleri şu günlere paylaştır"
 * isteğini görev taslaklarına çeviriyor; taslakları yazmak
 * `nodeMutations.ts`'in işi.
 *
 * ── Neden düğüm silinip görev doğmuyor, ikisi bir arada? ──
 * Düğüm PLANDIR, görev İŞTİR. Bir düğümden birden çok görev
 * doğabilir ("50 soru"yu üç güne bölmek) ve düğüm, o görevlerin
 * hepsini kapsayan başlık olarak yaşamaya devam eder. Düğümün
 * ilerlemesi de zaten o görevlerden okunuyor (nodeprogress.ts).
 *
 * ── Neden sıra girdiden geliyor? ──
 * Kullanıcı ağaçta GÖRDÜĞÜ sırayla seçiyor ve o sıra anlamlı: "önce
 * konu anlatımı, sonra soru bankası". Dağıtımı alfabeye ya da
 * kimliğe göre sıralasaydık planın mantığı bozulurdu.
 */

import { compareDates, eachDay } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { GoalNode } from "./types";

export interface DistributionTarget {
  from: DateStr;
  /** Tek güne dağıtımda `from` ile aynı. */
  to: DateStr;
  /**
   * Bir güne en çok kaç kalem?
   *
   * null → SINIRSIZ ve bu "eşit böl" demek DEĞİL: kullanıcı bir sınır
   * vermediyse bölmeyi biz uydurmamalıyız, hepsi ilk güne gider. Tek
   * gün akışı (`from === to`) zaten bu hâli kullanıyor.
   */
  perDayCap: number | null;
}

/** Bir düğümden doğacak görevin taslağı. */
export interface NodeTaskDraft {
  nodeId: string;
  /** Görev hedefi de taşır — gerekçe 0022 (iki çözünürlük, tek küme). */
  goalId: string;
  title: string;
  dueDate: DateStr;
}

export interface DistributionPlan {
  drafts: NodeTaskDraft[];
  /**
   * Günlere sığmayan düğümler.
   *
   * Sessizce atılmazlar ve zorla son güne yığılmazlar: arayüz
   * "3 kalem sığmadı" diye uyarır ve kullanıcı ya aralığı genişletir
   * ya sınırı artırır. Kullanıcının seçtiği bir kalemin hiçbir yerde
   * görünmeden kaybolması, uygulamayı güvenilmez yapardı.
   */
  overflow: GoalNode[];
}

/**
 * Seçili düğümlerden görev taslakları üretir.
 *
 * Günler sırayla doldurulur (round-robin değil, ARDIŞIK): bir gün
 * sınırına kadar dolar, sonra sonrakine geçilir. Kullanıcı "günde 2
 * konu" dediğinde ilk iki kalemi aynı gün görmeyi bekliyor.
 *
 * Bozuk aralık (`to < from`) ve `perDayCap: 0` → hiçbir gün yok
 * sayılır, her şey `overflow`'a düşer. Sessizce bir gün uydurmak,
 * kullanıcının görmediği bir tarihe görev yazmak olurdu.
 */
export function planDistribution(
  nodes: readonly GoalNode[],
  target: DistributionTarget,
  goalId: string,
): DistributionPlan {
  if (nodes.length === 0) return { drafts: [], overflow: [] };

  const days =
    compareDates(target.to, target.from) < 0
      ? []
      : eachDay(target.from, target.to);

  if (days.length === 0 || target.perDayCap === 0) {
    return { drafts: [], overflow: [...nodes] };
  }

  const drafts: NodeTaskDraft[] = [];
  const overflow: GoalNode[] = [];

  let dayIndex = 0;
  let placedToday = 0;

  for (const node of nodes) {
    if (target.perDayCap !== null && placedToday >= target.perDayCap) {
      dayIndex += 1;
      placedToday = 0;
    }

    if (dayIndex >= days.length) {
      overflow.push(node);
      continue;
    }

    drafts.push({
      nodeId: node.id,
      goalId,
      // Serbest metin: düğümün başlığı görevin başlığıdır. Ek bir
      // biçimlendirme ("Kimya › Asitler › ...") yapılmıyor — kullanıcı
      // başlığı zaten okunacak şekilde yazdı ve gün listesinde uzun
      // bir iz gürültü olurdu.
      title: node.title,
      dueDate: days[dayIndex],
    });
    placedToday += 1;
  }

  return { drafts, overflow };
}

/** Gün başına sınırın üst değeri — arayüz alanının doğrulaması. */
export const PER_DAY_CAP_MAX = 99;

/**
 * Gün başına sınırı çözer.
 *
 * `parseTargetCount`'un (goal.ts) üç durumlu sözleşmesini izler ama
 * BİR YERDE ondan ayrılır: boş girdi burada `null` DEĞİL, GEÇERSİZ.
 *
 * Orada boş "ölçü yok, görevlerden okunur" demekti — anlamlı bir
 * seçim. Burada aralığa dağıtırken "sınırsız", hepsini ilk güne
 * yığmak olurdu ve kullanıcı bir aralık vererek tam olarak bunu
 * istemediğini söylemiş oluyor. Sessizce ilk güne yığmak, verilen
 * aralığı yok saymak demekti.
 */
export function parsePerDayCap(input: string): number | undefined {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;

  const value = Number(trimmed);
  if (value < 1 || value > PER_DAY_CAP_MAX) return undefined;
  return value;
}
