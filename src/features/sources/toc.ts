import { normalize } from "@/lib/text/normalize";
import type { SeriesKind, SourceKind, SourceUnit } from "./types";

/*
 * İçindekiler metni → seri/bölüm ağacı. Saf; kaynak formunun canlı
 * önizlemesi ve kaydı aynı sonucu kullanır.
 *
 * Biçim (her satır bir şey):
 *
 *   # Konu Testleri              yeni seri; tür addan tahmin edilir
 *   Basit Harmonik Hareket | 39-46
 *   Dalga Mekaniği | 5 test      sayı → önceki bölümün devamı (47-51)
 *   # ÖSYM Tipi | 1-10           aralıklı seri başlığı: serinin tek bölümü
 *   7 = Basit Harmonik Hareket   o serideki 7. testin konusu
 *
 *   Video:  12 | Basit Harmonik Hareket   (ders no | konu)
 *           Basit Harmonik Hareket | 10-14 (konu | ders aralığı)
 *
 * Seri başlığı yoksa her şey tek seriye girer ("Konu Testleri";
 * videoda "Dersler"). Boş satır atlanır; hatalı satır satır numarasıyla
 * raporlanır, geri kalanı yine ayrıştırılır (önizleme yarım metinde de
 * çalışsın).
 */

export interface ParsedSection {
  label: string;
  from: number;
  to: number;
  /** 1 tabanlı satır numarası. */
  line: number;
  /** Aralıklı seri başlığından doğdu ("# ÖSYM Tipi | 1-10"): konusu yok. */
  implicit: boolean;
}

export interface ParsedItemTopic {
  number: number;
  topic: string;
  line: number;
}

export interface ParsedSeries {
  name: string;
  kind: SeriesKind;
  /** Başlık satırı; null → varsayılan seri. */
  line: number | null;
  sections: ParsedSection[];
  itemTopics: ParsedItemTopic[];
}

export interface TocError {
  line: number;
  text: string;
  message: string;
}

export interface ParsedToc {
  series: ParsedSeries[];
  errors: TocError[];
}

export interface TocOptions {
  kind: SourceKind;
  unit: SourceUnit;
}

export const MAX_UNIT = 100000;

export function defaultSeriesName(kind: SourceKind): string {
  return kind === "video" ? "Dersler" : "Konu Testleri";
}

/** Seri türünü addan tahmin et (önizlemede değiştirilebilir). */
export function guessSeriesKind(name: string): SeriesKind {
  const n = normalize(name);
  if (n.includes("osym")) return "osym";
  if (n.includes("sarmal")) return "sarmal";
  if (n.includes("simulasyon") || n.includes("deneme")) return "simulasyon";
  if (n.includes("konu")) return "konu";
  return "diger";
}

const DASH = "[-–—]";
const UNIT_WORD = "(?:test(?:ler)?|soru(?:lar)?|sayfa(?:lar)?|ders(?:ler)?)";
const RANGE_RE = new RegExp(`^(\\d+)\\s*${DASH}\\s*(\\d+)\\.?\\s*${UNIT_WORD}?$`);
const SINGLE_RE = new RegExp(`^(\\d+)\\.?\\s*${UNIT_WORD}?$`);
const COUNT_RE = new RegExp(`^(\\d+)\\s+${UNIT_WORD}$`);
const ITEM_TOPIC_RE = /^(\d+)\s*=\s*(.+)$/;

type Amount = { kind: "range"; from: number; to: number } | { kind: "count"; count: number };

/**
 * "39-46", "39 - 42. Testler", "12", "8 test". Sayı ile birim arasında
 * boşluk varsa ADET ("8 test"), yoksa tek numara ("12").
 */
export function parseAmount(raw: string): Amount | null {
  const text = normalize(raw.trim()).replace(/\s+/g, " ");
  const count = COUNT_RE.exec(text);
  if (count) return { kind: "count", count: Number(count[1]) };
  const range = RANGE_RE.exec(text);
  if (range) return { kind: "range", from: Number(range[1]), to: Number(range[2]) };
  const single = SINGLE_RE.exec(text);
  if (single) return { kind: "range", from: Number(single[1]), to: Number(single[1]) };
  return null;
}

function cleanLabel(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function parseToc(text: string, opts: TocOptions): ParsedToc {
  const errors: TocError[] = [];
  const series: ParsedSeries[] = [];
  let current: ParsedSeries | null = null;

  const ensureSeries = (): ParsedSeries => {
    if (!current) {
      current = {
        name: defaultSeriesName(opts.kind),
        kind: "konu",
        line: null,
        sections: [],
        itemTopics: [],
      };
      series.push(current);
    }
    return current;
  };

  const nextStart = (s: ParsedSeries): number =>
    s.sections.reduce((max, sec) => Math.max(max, sec.to), 0) + 1;

  const addSection = (s: ParsedSeries, sec: ParsedSection, raw: string): void => {
    if (sec.from < 1 || sec.to < sec.from) {
      errors.push({ line: sec.line, text: raw, message: "Aralık ters ya da 1'den küçük" });
      return;
    }
    if (sec.to > MAX_UNIT) {
      errors.push({ line: sec.line, text: raw, message: `En fazla ${MAX_UNIT}` });
      return;
    }
    const clash = s.sections.find((o) => sec.from <= o.to && o.from <= sec.to);
    if (clash) {
      errors.push({
        line: sec.line,
        text: raw,
        message: `"${clash.label}" (${clash.from}-${clash.to}) ile çakışıyor`,
      });
      return;
    }
    s.sections.push(sec);
  };

  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, index) => {
    const line = index + 1;
    const raw = rawLine.trim();
    if (raw === "") return;

    // ── Seri başlığı ──
    if (raw.startsWith("#")) {
      const body = raw.replace(/^#+/, "").trim();
      const [namePart, amountPart, ...rest] = body.split("|").map((p) => p.trim());
      const name = cleanLabel(namePart ?? "");
      if (!name || rest.length > 0) {
        errors.push({ line, text: raw, message: "Seri başlığı: '# Seri adı' ya da '# Seri adı | 1-10'" });
        return;
      }
      current = { name, kind: guessSeriesKind(name), line, sections: [], itemTopics: [] };
      series.push(current);
      if (amountPart !== undefined) {
        const amount = parseAmount(amountPart);
        if (!amount) {
          errors.push({ line, text: raw, message: "Aralık okunamadı (ör. 1-10)" });
          return;
        }
        const from = amount.kind === "range" ? amount.from : 1;
        const to = amount.kind === "range" ? amount.to : amount.count;
        addSection(current, { label: name, from, to, line, implicit: true }, raw);
      }
      return;
    }

    // ── "7 = Konu": serideki tek testin konusu ──
    const itemTopic = ITEM_TOPIC_RE.exec(raw);
    if (itemTopic) {
      if (opts.unit !== "test") {
        errors.push({ line, text: raw, message: "'N = Konu' yalnızca test birimli kaynaklarda" });
        return;
      }
      const s = ensureSeries();
      const number = Number(itemTopic[1]);
      const topic = cleanLabel(itemTopic[2]);
      if (!s.sections.some((sec) => number >= sec.from && number <= sec.to)) {
        errors.push({ line, text: raw, message: `${number}. test bu seride yok` });
        return;
      }
      s.itemTopics = s.itemTopics.filter((t) => t.number !== number);
      s.itemTopics.push({ number, topic, line });
      return;
    }

    // ── Bölüm satırı ──
    const parts = raw.split("|").map((p) => p.trim());
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      errors.push({
        line,
        text: raw,
        message:
          opts.kind === "video"
            ? "Biçim: '12 | Konu' ya da 'Konu | 10-14'"
            : "Biçim: 'Konu | 1-74' ya da 'Konu | 8 test'",
      });
      return;
    }

    const s = ensureSeries();
    let [labelPart, amountPart] = parts;
    // Video: "12 | Konu" → sol taraf ders numarası.
    if (opts.kind === "video" && parseAmount(labelPart) && !parseAmount(amountPart)) {
      [labelPart, amountPart] = [amountPart, labelPart];
    }
    const label = cleanLabel(labelPart);
    const amount = parseAmount(amountPart);
    if (!amount) {
      errors.push({ line, text: raw, message: `Aralık okunamadı: "${amountPart}"` });
      return;
    }
    if (amount.kind === "count") {
      if (amount.count < 1) {
        errors.push({ line, text: raw, message: "Adet en az 1" });
        return;
      }
      const from = nextStart(s);
      addSection(s, { label, from, to: from + amount.count - 1, line, implicit: false }, raw);
    } else {
      addSection(s, { label, from: amount.from, to: amount.to, line, implicit: false }, raw);
    }
  });

  for (const s of series) {
    if (s.sections.length === 0 && s.line !== null) {
      errors.push({ line: s.line, text: `# ${s.name}`, message: "Seride bölüm yok" });
    }
  }

  errors.sort((a, b) => a.line - b.line);
  return { series: series.filter((s) => s.sections.length > 0), errors };
}

/**
 * Ağacı yeniden metne çevir (düzenleme formu bunu açar). `parseToc`
 * ile gidiş-dönüş aynı ağacı verir.
 */
export function tocText(
  series: ReadonlyArray<{
    name: string;
    sections: ReadonlyArray<{ label: string; from: number; to: number }>;
    itemTopics?: ReadonlyArray<{ number: number; topic: string }>;
  }>,
  opts: TocOptions,
): string {
  const out: string[] = [];
  const single = series.length === 1 && series[0].name === defaultSeriesName(opts.kind);
  series.forEach((s, i) => {
    const onlyImplicit = s.sections.length === 1 && s.sections[0].label === s.name;
    if (!single) {
      if (i > 0) out.push("");
      out.push(onlyImplicit ? `# ${s.name} | ${rangeText(s.sections[0])}` : `# ${s.name}`);
    }
    if (!onlyImplicit || single) {
      for (const sec of s.sections) {
        out.push(
          opts.kind === "video" && sec.from === sec.to
            ? `${sec.from} | ${sec.label}`
            : `${sec.label} | ${rangeText(sec)}`,
        );
      }
    }
    for (const t of [...(s.itemTopics ?? [])].sort((a, b) => a.number - b.number)) {
      out.push(`${t.number} = ${t.topic}`);
    }
  });
  return out.join("\n");
}

function rangeText(r: { from: number; to: number }): string {
  return r.from === r.to ? String(r.from) : `${r.from}-${r.to}`;
}
