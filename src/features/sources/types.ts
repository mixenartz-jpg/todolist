export type SourceUnit = "test" | "soru" | "sayfa";

export const UNIT_LABELS: Record<SourceUnit, string> = {
  test: "test",
  soru: "soru",
  sayfa: "sayfa",
};

export interface Source {
  id: string;
  title: string;
  subject: string | null;
  totalTests: number;
  unit: SourceUnit;
  aliases: string[];
  sortOrder: number;
  archivedAt: string | null;
}

export interface SourceDraft {
  title: string;
  subject: string | null;
  totalTests: number;
  unit: SourceUnit;
  aliases: string[];
}
