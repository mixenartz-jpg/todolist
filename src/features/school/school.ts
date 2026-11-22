import type { Topic } from "@/features/sources/types";
import type { TopicStats } from "@/features/topics/stats";
import type { DateStr } from "@/lib/date/types";

/*
 * Okul nerede (0040): konu başına okulun durumu. Saf.
 *
 * Satır yoksa konu okulda işlenmedi. Öğrencinin kendi çalışmasıyla
 * (TopicStats) karşılaştırınca üç durum çıkar:
 *
 *   behind  okulda işlendi / işleniyor ama öğrenci başlamadı ya da zayıf
 *   ahead   öğrenci çalışıyor, okul henüz işlemedi
 *   ok      ikisi uyumlu
 */

export type SchoolStatus = "current" | "done";

export interface SchoolMark {
  topicId: string;
  status: SchoolStatus;
  coveredOn: DateStr | null;
}

export type SchoolGap = "behind" | "ahead" | "ok";

export const SCHOOL_LABELS: Record<SchoolStatus | "none", string> = {
  none: "İşlenmedi",
  current: "İşleniyor",
  done: "İşlendi",
};

export function schoolGap(stat: TopicStats, mark: SchoolMark | undefined): SchoolGap {
  if (mark) return stat.status === "none" || stat.status === "weak" ? "behind" : "ok";
  return stat.status === "none" ? "ok" : "ahead";
}

export interface SchoolSummary {
  total: number;
  done: number;
  /** Okulda şu an işlenen konular (konu sırasıyla). */
  current: Topic[];
  /** Okulda işlendi/işleniyor ama öğrenci geride. */
  behind: number;
}

export function schoolSummary(
  stats: readonly TopicStats[],
  marks: ReadonlyMap<string, SchoolMark>,
): SchoolSummary {
  let done = 0;
  let behind = 0;
  const current: Topic[] = [];
  for (const s of stats) {
    const m = marks.get(s.topic.id);
    if (m?.status === "done") done++;
    if (m?.status === "current") current.push(s.topic);
    if (schoolGap(s, m) === "behind") behind++;
  }
  return { total: stats.length, done, current, behind };
}

/** Konu ekranı süzgeci (`?goster=`). */
export type TopicFilter = "all" | "behind" | "weak" | "none";

export const TOPIC_FILTERS: ReadonlyArray<{ id: TopicFilter; label: string }> = [
  { id: "all", label: "Tümü" },
  { id: "behind", label: "Okulda işlendi, geride" },
  { id: "weak", label: "Zayıf" },
  { id: "none", label: "Başlanmadı" },
];

export function parseTopicFilter(v: string | null): TopicFilter {
  return TOPIC_FILTERS.some((f) => f.id === v) ? (v as TopicFilter) : "all";
}

export function filterTopics(
  stats: readonly TopicStats[],
  marks: ReadonlyMap<string, SchoolMark>,
  filter: TopicFilter,
): TopicStats[] {
  switch (filter) {
    case "all":
      return [...stats];
    case "behind":
      return stats.filter((s) => schoolGap(s, marks.get(s.topic.id)) === "behind");
    case "weak":
      return stats.filter((s) => s.status === "weak");
    case "none":
      return stats.filter((s) => s.status === "none");
  }
}
