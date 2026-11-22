import { addDays } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { SourceProgress } from "./progress";
import type { SourceStatus } from "./types";
import { addSummaries, type UnitSummary } from "./unitStatus";

/*
 * Kaynak takip: kaynak başına TEMPO. Saf.
 *
 *   kalan        toplam − çözülen (yeşil)
 *   son 14 gün   tarihi pencereye düşen yeşil birimler
 *   son çalışma  yeşil birimlerin en yeni günü
 *   tahmini      kalan ÷ günlük tempo → gün; tempo yoksa null
 */

export const PACE_WINDOW_DAYS = 14;

export interface SourceTrack {
  p: SourceProgress;
  remaining: number;
  recent: number;
  lastDate: DateStr | null;
  /** Bu tempoyla bitişe kalan gün; tempo yoksa ya da bittiyse null. */
  etaDays: number | null;
}

export interface SubjectTrack {
  subject: string;
  summary: UnitSummary;
  rows: SourceTrack[];
}

const STATUS_RANK: Record<SourceStatus, number> = { devam: 0, sirada: 1, bitti: 2 };

export function trackSource(p: SourceProgress, today: DateStr): SourceTrack {
  const from = addDays(today, -(PACE_WINDOW_DAYS - 1));
  let recent = 0;
  let lastDate: DateStr | null = null;
  for (const series of p.series)
    for (const sec of series.sections)
      for (const st of sec.states) {
        if (st.color !== "green" || !st.date) continue;
        const d = st.result?.doneOn ?? st.date;
        if (d >= from && d <= today) recent++;
        if (!lastDate || d > lastDate) lastDate = d;
      }
  const remaining = p.summary.total - p.summary.green;
  const etaDays = remaining > 0 && recent > 0 ? Math.ceil(remaining / (recent / PACE_WINDOW_DAYS)) : null;
  return { p, remaining, recent, lastDate, etaDays };
}

/** Derse göre gruplu; grupta önce Devam, sonra Sırada, Bitti; aynı durumda son çalışılan önde. */
export function trackSources(list: readonly SourceProgress[], today: DateStr, other = "Diğer"): SubjectTrack[] {
  const groups = new Map<string, SourceTrack[]>();
  for (const p of list) {
    if (p.source.archivedAt) continue;
    const key = p.source.subject?.trim() || other;
    groups.set(key, [...(groups.get(key) ?? []), trackSource(p, today)]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === other ? 1 : b === other ? -1 : a.localeCompare(b, "tr")))
    .map(([subject, rows]) => ({
      subject,
      summary: addSummaries(rows.map((r) => r.p.summary)),
      rows: rows.sort(
        (x, y) =>
          STATUS_RANK[x.p.source.status] - STATUS_RANK[y.p.source.status] ||
          (y.lastDate ?? "").localeCompare(x.lastDate ?? "") ||
          x.p.source.title.localeCompare(y.p.source.title, "tr"),
      ),
    }));
}

