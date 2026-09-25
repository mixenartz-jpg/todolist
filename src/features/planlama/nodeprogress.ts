/**
 * Hedef ağacının ilerlemesi — saf mantık.
 *
 * ── Toplama kuralı: ALT AĞACIN TOPLAMI, çocuk ortalaması DEĞİL ──
 * Bu modülün tek önemli kararı ve yanlışı sessiz olurdu.
 *
 * "Kimya"nın iki çocuğu olsun: "Asitler" (1 görev, bitti) ve "Organik"
 * (20 görev, 0 bitti). Çocuk ortalaması %50 der. Alt ağacın toplamı
 * %4.8 der. İkincisi kullanıcının ihtiyacı olan gerçek; ilki tek
 * önemsiz bir kalemin yirmi dokunulmamış kalemi örtmesine izin verir
 * ve kullanıcı haftasını yarı yolda sanarak planlar.
 *
 * 0008'in "dilimlerin toplamı %100'e gider" garantisiyle aynı ilke:
 * bir yüzdenin arkasında SAYILABİLİR bir payda olmalı, yoksa grafik
 * yalan söyler.
 *
 * Ayrıca `goalProgress` (rollup.ts) zaten `taskDone / taskTotal` —
 * aynı aritmetik bir seviye yukarıda. Bu sayede hedef kartındaki oran
 * ile ağaç sayfasındaki oran asla çelişmiyor (bunun testi var).
 *
 * ── Çift sayım neden imkânsız? ──
 * Ağaçtan doğan görev hem `goalId` hem `nodeId` taşır (0022) ama İKİ
 * SAYAÇ DEĞİL, aynı görev kümesinin iki çözünürlüğü: `goalProgress`
 * görevleri `goalId`'den sayar, bu modül aynı görevleri `nodeId`'den
 * gruplar. Bir görev bir düğüme bağlıdır (en fazla bir tane), yani
 * alt ağaç toplamları da bir görevi iki kez göremez.
 *
 * ── Neden düğümün kendi sayacı yok? ──
 * `PlanGoal.targetCount` gibi elle işaretlenen bir sayaç eklenmedi ve
 * bu kullanıcının kararı: ilerleme çocuklardan TÜRETİLİR. İkinci bir
 * kaynak, "bu düğüm bitti mi?" sorusunun iki cevabı olması demekti —
 * 0014'ün çift sayım gerekçesinin aynısı.
 */

import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";
import { buildGoalTree, type GoalTreeNode } from "./tree";
import type { GoalNode } from "./types";

/** Bir düğümün ilerleme durumu. */
export interface NodeProgress {
  node: GoalNode;
  /**
   * Bu düğümün ve TÜM ALTININ bağlı görev sayısı.
   *
   * Yaprakta yalnızca kendi görevleri; üst düğümde alt ağacın
   * tamamı — kendi doğrudan görevleri dahil.
   */
  taskTotal: number;
  taskDone: number;
  /**
   * 0..1 ilerleme.
   *
   * null → ÖLÇÜLMÜYOR. `GoalProgress.ratio` ile birebir aynı anlam ve
   * aynı gerekçe: `0` "hiç başlamadın" der, doğrusu "henüz
   * dağıtılmadı". Arayüz ikisini farklı çizmeli — biri boş çubuk,
   * diğeri çubuk yerine bir cümle.
   */
  ratio: number | null;
  /** İlerlemenin nereden okunduğu — arayüz metnini seçmek için. */
  source: "tasks" | "rollup" | "none";
  /** Çocuğu yok mu? Arayüz yaprağa "güne gönder" sunuyor. */
  leaf: boolean;
}

/**
 * Ağacın tamamının ilerlemesi: düğüm kimliğinden `NodeProgress`'e.
 *
 * Tek dipten-yukarı geçiş. Görevler önce `nodeId`'ye göre kovalanır,
 * ağaç bir kez kurulur, sonra post-order yürüyüşle biriktirilir —
 * `buildMonthRollup`'ın "tek geçiş" disiplini. Her düğüm için ayrı
 * ayrı görev listesini taramak, üç seviyelik bir ağaçta aynı listeyi
 * onlarca kez gezmek olurdu.
 */
export function goalTreeProgress(
  nodes: readonly GoalNode[],
  tasks: readonly Task[],
): Map<string, NodeProgress> {
  const own = new Map<string, { total: number; done: number }>();

  for (const task of tasks) {
    if (task.nodeId === null) continue;

    const entry = own.get(task.nodeId);
    if (entry) {
      entry.total += 1;
      if (task.done) entry.done += 1;
    } else {
      own.set(task.nodeId, { total: 1, done: task.done ? 1 : 0 });
    }
  }

  const out = new Map<string, NodeProgress>();
  for (const root of buildGoalTree(nodes)) accumulate(root, own, out);
  return out;
}

/**
 * Bir dalı post-order gezip kendi ve altının sayılarını toplar.
 *
 * Dönen değer, ÇAĞIRAN ebeveynin kendi toplamına ekleyeceği pay.
 */
function accumulate(
  entry: GoalTreeNode,
  own: ReadonlyMap<string, { total: number; done: number }>,
  out: Map<string, NodeProgress>,
): { total: number; done: number } {
  // Düğümün KENDİ görevleri. Bir ara düğüm de güne gönderilebilir,
  // bu yüzden yalnızca yapraklarda bakmak eksik sayardı.
  const mine = own.get(entry.node.id);
  let total = mine?.total ?? 0;
  let done = mine?.done ?? 0;

  for (const child of entry.children) {
    const sub = accumulate(child, own, out);
    total += sub.total;
    done += sub.done;
  }

  const leaf = entry.children.length === 0;

  out.set(entry.node.id, {
    node: entry.node,
    taskTotal: total,
    taskDone: done,
    ratio: total === 0 ? null : done / total,
    // Ne görev ne çocuk: ölçülmüyor. Yaprak/üst ayrımı yalnızca
    // arayüzün metni seçmesi için — "henüz dağıtılmadı" ile
    // "altındaki kalemler henüz dağıtılmadı" farklı cümleler.
    source: total === 0 ? "none" : leaf ? "tasks" : "rollup",
    leaf,
  });

  return { total, done };
}

/**
 * Ağacın tepesindeki tek oran: hedefin tamamının ilerlemesi.
 *
 * KÖK düğümlerin toplamı alınır, tüm düğümlerin değil — her kök zaten
 * kendi alt ağacının toplamını taşıyor ve hepsini toplamak aynı
 * görevleri derinlik kadar tekrar saymak olurdu (bunun testi var).
 */
export function treeRootRatio(
  progress: ReadonlyMap<string, NodeProgress>,
  nodes: readonly GoalNode[],
): number | null {
  let total = 0;
  let done = 0;

  for (const node of nodes) {
    if (node.parentId !== null) continue;

    const entry = progress.get(node.id);
    if (entry === undefined) continue;

    total += entry.taskTotal;
    done += entry.taskDone;
  }

  return total === 0 ? null : done / total;
}

/**
 * Her kalemin KENDİ görevleri — "bu kalem nereye gönderildi?"
 *
 * `goalTreeProgress`'in aksine alt ağacı TOPLAMAZ: satırda gösterilen
 * çipler o kalemin kendisinden doğan görevlerdir; çocukların görevleri
 * kendi satırlarında görünür. Toplansaydı aynı görev her atasının
 * satırında bir kez daha "geri al" düğmesiyle çıkardı.
 *
 * Sıra tarihe göre; tarihsizler (havuza geri atılmış) SONDA.
 */
export function sentTasksByNode(tasks: readonly Task[]): Map<string, Task[]> {
  const out = new Map<string, Task[]>();

  for (const task of tasks) {
    if (task.nodeId === null) continue;
    const list = out.get(task.nodeId);
    if (list) list.push(task);
    else out.set(task.nodeId, [task]);
  }

  for (const list of out.values()) {
    list.sort((a, b) => {
      if (a.dueDate === b.dueDate) return 0;
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    });
  }

  return out;
}

/** Bir kalemin güne dağıtılma durumu — Planlama'nın ağaç paneli için. */
export interface NodeDispatch {
  /**
   * none   → henüz güne gönderilmedi.
   * sent   → gönderildi, işi bitmedi.
   * done   → gönderildi ve işi bitti.
   * repeat → tekrarlanan kalem (0024): hiç tükenmez, çizilmez.
   */
  state: "none" | "sent" | "done" | "repeat";
  /**
   * `sent` iken işaretin göstereceği gün: bitmemiş görevlerin EN ERKENİ
   * (kullanıcının sıradaki randevusu). Tarihsiz görev havuzdadır → null.
   */
  day: DateStr | null;
  /** Kalemin KENDİ görev sayısı — tekrarlananda "3×" olarak görünür. */
  count: number;
  /**
   * Kalemin KENDİ bitmemiş görevlerinin günleri, sıralı (tarihsiz =
   * null, sonda). Birden çok güne gönderilen kalemde hepsi görünsün
   * diye; `day` bunun ilkidir. Başlıkta (kendi görevi yoksa) boş.
   */
  days: (DateStr | null)[];
}

/**
 * Her kalemin dağıtılma durumu.
 *
 * ── Üst başlık ne zaman "gönderildi" sayılır? ──
 * Kendi görevi varsa (başlığın kendisi güne gönderilmişse) ondan
 * okunur. Yoksa ÇOCUKLARINDAN: hepsi gönderilmiş/bitmişse gönderildi,
 * hepsi bitmişse bitti. Tek bir çocuk gönderildi diye başlığın üstünü
 * çizmek, geri kalan dokunulmamış kalemleri gizlerdi — `goalTreeProgress`
 * modülünün "tek önemsiz kalem yirmi kalemi örtmesin" ilkesi.
 */
export function nodeDispatch(
  nodes: readonly GoalNode[],
  tasks: readonly Task[],
): Map<string, NodeDispatch> {
  const own = sentTasksByNode(tasks);
  const out = new Map<string, NodeDispatch>();

  const visit = (entry: GoalTreeNode): NodeDispatch => {
    const children = entry.children.map(visit);
    const mine = own.get(entry.node.id) ?? [];

    const count = mine.length;
    // `sentTasksByNode` tarihe göre sıralı, tarihsizler sonda.
    const openDays = mine.filter((t) => !t.done).map((t) => t.dueDate);
    const nextOpen = openDays[0] ?? null;

    let result: NodeDispatch;
    if (entry.node.repeating) {
      // Tekrarlanan kalem tükenmez: durumu her zaman "repeat".
      result = { state: "repeat", day: nextOpen, count, days: openDays };
    } else if (count > 0) {
      const open = mine.filter((t) => !t.done);
      result =
        open.length === 0
          ? { state: "done", day: null, count, days: [] }
          : { state: "sent", day: nextOpen, count, days: openDays };
    } else if (
      children.length > 0 &&
      // Tekrarlanan çocuk en az bir kez gönderildiyse "karşılanmış"
      // sayılır; hiç gönderilmediyse başlığı çizdirmez.
      children.every((c) =>
        c.state === "repeat" ? c.count > 0 : c.state !== "none",
      )
    ) {
      // Tekrarlanan çocuk hiç "bitmez" — başlık en fazla "sent" olur.
      const pending = children.filter(
        (c) => c.state === "sent" || c.state === "repeat",
      );
      const days = pending
        .map((c) => c.day)
        .filter((d): d is DateStr => d !== null)
        .sort();
      result =
        pending.length === 0
          ? { state: "done", day: null, count, days: [] }
          : { state: "sent", day: days[0] ?? null, count, days: [] };
    } else {
      result = { state: "none", day: null, count, days: [] };
    }

    out.set(entry.node.id, result);
    return result;
  };

  for (const root of buildGoalTree(nodes)) visit(root);
  return out;
}
