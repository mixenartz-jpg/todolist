import type { MarkStatus } from "./unitStatus";

/*
 * Aralık işaretleri (soru/sayfa/ders) bir bölümde ÇAKIŞMAZ: yeni işaret
 * altındaki eski işaretleri böler. "İşareti kaldır" da aynı işlem,
 * yalnızca yerine bir şey konmaz. Sonuç tam liste: istemci bölümün
 * işaretlerini silip bunu yazar (birkaç satır).
 */

export interface RangeMarkSpan {
  from: number;
  to: number;
  status: MarkStatus;
  markedAt: string;
  note: string | null;
}

export function applyRangeMark(
  marks: readonly RangeMarkSpan[],
  from: number,
  to: number,
  next: { status: MarkStatus; markedAt: string; note: string | null } | null,
): RangeMarkSpan[] {
  if (to < from) [from, to] = [to, from];
  const out: RangeMarkSpan[] = [];
  for (const m of marks) {
    if (m.to < from || m.from > to) {
      out.push(m);
      continue;
    }
    if (m.from < from) out.push({ ...m, to: from - 1 });
    if (m.to > to) out.push({ ...m, from: to + 1 });
  }
  if (next) out.push({ from, to, ...next });
  return mergeAdjacent(out.sort((a, b) => a.from - b.from));
}

/** Aynı durum ve notla bitişik parçaları birleştir (satır sayısı şişmesin). */
function mergeAdjacent(marks: RangeMarkSpan[]): RangeMarkSpan[] {
  const out: RangeMarkSpan[] = [];
  for (const m of marks) {
    const last = out[out.length - 1];
    if (last && last.to + 1 === m.from && last.status === m.status && last.note === m.note) {
      last.to = m.to;
      if (m.markedAt > last.markedAt) last.markedAt = m.markedAt;
    } else {
      out.push({ ...m });
    }
  }
  return out;
}

/** "1-52", "52", "1 - 52" → aralık; bölüm dışına taşan kısım kırpılır. */
export function parseRangeInput(text: string, min: number, max: number): { from: number; to: number } | null {
  const m = /^\s*(\d+)\s*(?:[-–—]\s*(\d+))?\s*$/.exec(text);
  if (!m) return null;
  let from = Number(m[1]);
  let to = m[2] ? Number(m[2]) : from;
  if (to < from) [from, to] = [to, from];
  from = Math.max(min, from);
  to = Math.min(max, to);
  return from <= to ? { from, to } : null;
}

/** Shift+tık: son tıklanandan bu yana ardışık numaralar. */
export function rangeSelect(prev: ReadonlySet<number>, anchor: number | null, n: number, shift: boolean): Set<number> {
  const next = new Set(prev);
  if (shift && anchor !== null) {
    const [a, b] = anchor < n ? [anchor, n] : [n, anchor];
    for (let i = a; i <= b; i++) next.add(i);
    return next;
  }
  if (next.has(n)) next.delete(n);
  else next.add(n);
  return next;
}
