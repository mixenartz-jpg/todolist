/*
 * Kaynak ağacı (0034): Kaynak → Seri → Bölüm → Birim.
 *
 *   Source   kitap ya da video kursu
 *   Series   kitabın içindeki test serisi (Konu Testleri, ÖSYM Tipi,
 *            Sarmal, Simülasyon…). Serisiz kitapta tek 'konu' serisi.
 *   Section  içindekiler satırı: "Basit Harmonik Hareket | 39-46"
 *   Item     unit='test' kaynaklarda her test; diğer birimlerde YOK —
 *            soru/sayfa/ders birimleri aralıkla izlenir.
 */

export type SourceKind = "kitap" | "video";
export type Exam = "TYT" | "AYT" | "LGS";
export type Level = "temel" | "orta" | "ileri";
export type SourceUnit = "test" | "soru" | "sayfa" | "ders";
export type SourceStatus = "sirada" | "devam" | "bitti";
export type SeriesKind = "konu" | "osym" | "sarmal" | "simulasyon" | "diger";

export const UNIT_LABELS: Record<SourceUnit, string> = {
  test: "test",
  soru: "soru",
  sayfa: "sayfa",
  ders: "ders",
};

export const KIND_LABELS: Record<SourceKind, string> = { kitap: "Kitap", video: "Video" };
export const LEVEL_LABELS: Record<Level, string> = { temel: "Temel", orta: "Orta", ileri: "İleri" };
export const STATUS_LABELS: Record<SourceStatus, string> = {
  sirada: "Sırada",
  devam: "Devam",
  bitti: "Bitti",
};
export const SERIES_KIND_LABELS: Record<SeriesKind, string> = {
  konu: "Konu",
  osym: "ÖSYM Tipi",
  sarmal: "Sarmal",
  simulasyon: "Simülasyon",
  diger: "Diğer",
};

export const EXAMS: readonly Exam[] = ["TYT", "AYT", "LGS"];

/** Konu listesi (0035 seed) olan dersler; kaynak başka ders de alabilir. */
export const SUBJECTS = ["Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Fen"] as const;

export interface Source {
  id: string;
  title: string;
  subject: string | null;
  exam: Exam | null;
  kind: SourceKind;
  publisher: string | null;
  level: Level | null;
  unit: SourceUnit;
  minutesPerUnit: number | null;
  status: SourceStatus;
  /** Bölümlerin en büyük bitişi (0029'dan kalan sütun; istemci yazar). */
  totalTests: number;
  studentId: string | null;
  aliases: string[];
  sortOrder: number;
  archivedAt: string | null;
}

export interface Series {
  id: string;
  sourceId: string;
  name: string;
  kind: SeriesKind;
  sortOrder: number;
}

export interface Section {
  id: string;
  seriesId: string;
  topicId: string | null;
  label: string;
  unitFrom: number;
  unitTo: number;
  sortOrder: number;
}

export interface Item {
  id: string;
  sectionId: string;
  number: number;
  /** null → bölümün konusu geçerli. */
  topicId: string | null;
}

export interface Topic {
  id: string;
  subject: string;
  exam: Exam;
  name: string;
  aliases: string[];
  sortOrder: number;
}

export interface SectionNode extends Section {
  items: Item[];
}

export interface SeriesNode extends Series {
  sections: SectionNode[];
}

/** Kaynak + tüm ağacı, sıralı. */
export interface SourceTree extends Source {
  series: SeriesNode[];
}

/** Kaynak formunun üst alanları (ağaç ayrı taşınır). */
export interface SourceDraft {
  title: string;
  kind: SourceKind;
  publisher: string | null;
  subject: string | null;
  exam: Exam | null;
  level: Level | null;
  unit: SourceUnit;
  minutesPerUnit: number | null;
}
