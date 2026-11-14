import type { DateStr } from "@/lib/date/types";
import type { TaskResult } from "@/features/results/types";
import type { Task } from "@/features/tasks/types";

/*
 * Birim durum motoru — kaynak ilerlemesinin TEK hesabı.
 *
 * Bir bölümdeki her birim (test / soru / sayfa / ders numarası) için
 * renk TÜRETİLİR; hiçbir yerde saklanmaz. Böylece görev silinince
 * birim kendiliğinden eski hâline döner ve görev sonucu elle işaretin
 * önüne geçer. Öncelik (yüksekten düşüğe):
 *
 *   1 yeşil  bağlı görev done; ya da partial ve bu birim işaretli
 *   2 yeşil  elle "çözüldü"                          (elle ikonu)
 *   3 sarı   bağlı görev var, sonuç yok
 *   4 sarı   elle "ödevlendirildi"                   (elle ikonu)
 *   5 kırmızı skipped; ya da partial ve bu birim işaretsiz → havuza döner
 *   6 gri    hiçbiri
 *
 * İlerleme yalnızca yeşilleri sayar. Sıradaki birim ve Dağıt yalnızca
 * gri ve kırmızıyı BOŞ sayar — elle "ödevlendirildi" işaretli test bir
 * daha önerilmez.
 */

export type UnitColor = "green" | "yellow" | "red" | "gray";

export type UnitReason =
  | "task-done"
  | "manual-done"
  | "task-pending"
  | "manual-assigned"
  | "task-missed"
  | "none";

const RANK: Record<UnitReason, number> = {
  "task-done": 1,
  "manual-done": 2,
  "task-pending": 3,
  "manual-assigned": 4,
  "task-missed": 5,
  none: 6,
};

const COLOR: Record<UnitReason, UnitColor> = {
  "task-done": "green",
  "manual-done": "green",
  "task-pending": "yellow",
  "manual-assigned": "yellow",
  "task-missed": "red",
  none: "gray",
};

export interface UnitState {
  number: number;
  color: UnitColor;
  reason: UnitReason;
  /** Elle işaretten geliyor. */
  manual: boolean;
  /** Durumu belirleyen görev (varsa). */
  task: Task | null;
  result: TaskResult | null;
  /** Görev günü ya da işaret günü. */
  date: DateStr | null;
  note: string | null;
}

export type MarkStatus = "assigned" | "done";

export interface UnitMark {
  from: number;
  to: number;
  status: MarkStatus;
  /** ISO damga — çakışan aralıklarda yenisi geçerli. */
  markedAt: string;
  note: string | null;
}

/** Göreve bağlı birimler: test kaynağında test numaraları, diğerlerinde aralık. */
export interface LinkedTask {
  task: Task;
  /** Bu bölümde görevin kapsadığı birim numaraları. */
  units: readonly number[];
  /**
   * Yarım görevde öğrencinin işaretlediği birimler (test kaynağı).
   * Aralık birimlerinde `reachedTo` kullanılır.
   */
  doneUnits?: ReadonlySet<number>;
  result: TaskResult | null;
}

export interface SectionInput {
  from: number;
  to: number;
  links: readonly LinkedTask[];
  marks: readonly UnitMark[];
}

/** Görevin, verilen birim için önerdiği durum. */
function taskReason(link: LinkedTask, n: number): UnitReason {
  const { task, result } = link;
  const status = result?.status ?? null;
  const reachedTo = result?.reachedTo ?? null;
  const progressive = task.targetAmount != null && task.targetAmount > 0;

  if (status === "done") {
    // İlerlet: yalnızca ulaşılan noktaya kadar; ötesi havuza döner.
    if (progressive && reachedTo !== null) return n <= reachedTo ? "task-done" : "task-missed";
    return "task-done";
  }
  if (status === "partial") {
    if (link.doneUnits?.has(n)) return "task-done";
    if (reachedTo !== null && n <= reachedTo) return "task-done";
    return "task-missed";
  }
  if (status === "skipped") return "task-missed";
  // Sonuç yok ya da durumsuz: koç işaretlediyse tamam, değilse bekliyor.
  return task.done ? "task-done" : "task-pending";
}

export function sectionUnitStates(input: SectionInput): UnitState[] {
  const states: UnitState[] = [];
  const marks = [...input.marks].sort((a, b) => (a.markedAt < b.markedAt ? 1 : -1));

  for (let n = input.from; n <= input.to; n++) {
    let best: UnitState = {
      number: n,
      color: "gray",
      reason: "none",
      manual: false,
      task: null,
      result: null,
      date: null,
      note: null,
    };

    for (const link of input.links) {
      if (!link.units.includes(n)) continue;
      const reason = taskReason(link, n);
      // Eşit öncelikte en yeni görev görünür (tooltip için).
      const newer = (link.task.dueDate ?? "") > (best.date ?? "");
      if (RANK[reason] < RANK[best.reason] || (RANK[reason] === RANK[best.reason] && newer)) {
        best = {
          number: n,
          color: COLOR[reason],
          reason,
          manual: false,
          task: link.task,
          result: link.result,
          date: link.task.dueDate,
          note: null,
        };
      }
    }

    const mark = marks.find((m) => n >= m.from && n <= m.to);
    if (mark) {
      const reason: UnitReason = mark.status === "done" ? "manual-done" : "manual-assigned";
      if (RANK[reason] < RANK[best.reason]) {
        best = {
          number: n,
          color: COLOR[reason],
          reason,
          manual: true,
          task: null,
          result: null,
          date: mark.markedAt.slice(0, 10) as DateStr,
          note: mark.note,
        };
      }
    }
    states.push(best);
  }
  return states;
}

export interface UnitSummary {
  total: number;
  green: number;
  yellow: number;
  red: number;
  gray: number;
}

export function summarize(states: readonly UnitState[]): UnitSummary {
  const s: UnitSummary = { total: states.length, green: 0, yellow: 0, red: 0, gray: 0 };
  for (const st of states) s[st.color]++;
  return s;
}

export function addSummaries(list: readonly UnitSummary[]): UnitSummary {
  return list.reduce(
    (a, b) => ({
      total: a.total + b.total,
      green: a.green + b.green,
      yellow: a.yellow + b.yellow,
      red: a.red + b.red,
      gray: a.gray + b.gray,
    }),
    { total: 0, green: 0, yellow: 0, red: 0, gray: 0 },
  );
}

/** İlerleme oranı: yalnızca yeşiller. */
export function progressRatio(s: UnitSummary): number {
  return s.total === 0 ? 0 : s.green / s.total;
}

/** Boş birim: gri ya da kırmızı (sarılar dolu sayılır). */
export function isFree(st: UnitState): boolean {
  return st.color === "gray" || st.color === "red";
}

/** Sıradaki en fazla `count` boş birim, sırayla (testler için; ardışık olmayabilir). */
export function nextFreeUnits(states: readonly UnitState[], count: number): number[] {
  return states.filter(isFree).slice(0, Math.max(0, count)).map((s) => s.number);
}

/**
 * Aralık birimlerinde (soru/sayfa/ders) sıradaki ARDIŞIK boş parça:
 * ilk boş birimden başlar, dolu birime ya da `max` uzunluğa kadar.
 */
export function nextFreeRun(
  states: readonly UnitState[],
  max: number,
): { from: number; to: number } | null {
  const start = states.findIndex(isFree);
  if (start < 0 || max < 1) return null;
  let end = start;
  while (end + 1 < states.length && isFree(states[end + 1]) && end - start + 1 < max) end++;
  return { from: states[start].number, to: states[end].number };
}

/** Tüm boş birimlerin ardışık parçaları (Dağıt için). */
export function freeRuns(states: readonly UnitState[]): Array<{ from: number; to: number }> {
  const runs: Array<{ from: number; to: number }> = [];
  for (const st of states) {
    if (!isFree(st)) continue;
    const last = runs[runs.length - 1];
    if (last && last.to === st.number - 1) last.to = st.number;
    else runs.push({ from: st.number, to: st.number });
  }
  return runs;
}

/** Kaynağın otomatik durumu: ilk bağ → devam, %100 → bitti. */
export function derivedSourceStatus(
  s: UnitSummary,
  hasLinks: boolean,
): "sirada" | "devam" | "bitti" {
  if (s.total > 0 && s.green === s.total) return "bitti";
  if (hasLinks || s.green > 0 || s.yellow > 0) return "devam";
  return "sirada";
}

/**
 * Otomatik durum yalnızca İLERİ gider (sırada → devam → bitti); koçun
 * elle geri aldığı durumu (ör. "bitti" → "devam", tekrar için) ezmez —
 * yalnızca hesap daha ileri bir duruma geçtiğinde günceller.
 */
export function autoAdvance(
  stored: "sirada" | "devam" | "bitti",
  derived: "sirada" | "devam" | "bitti",
): "sirada" | "devam" | "bitti" | null {
  const order = { sirada: 0, devam: 1, bitti: 2 } as const;
  return order[derived] > order[stored] ? derived : null;
}
