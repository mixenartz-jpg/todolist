import { normalize } from "@/lib/text/normalize";
import type { Task } from "@/features/tasks/types";
import type { Source } from "./types";

/**
 * Görev başlığından kaynak + aralık çıkarma.
 *
 * Biçim "Kaynak | Konu | X-Y" ama gerçek başlıklar buna tam uymuyor:
 *   "Güçlendiren Matematik | 24-40 Arası Çöz + Analiz | 5 Test"
 *   "Kafadengi Mat | Üslü Sayılar | 26-33 Arası Çöz + Analiz"
 *   "345 AYT Fizik | Basit Harmonik Hareket | 280 - 301 | Çöz"
 * Bu yüzden:
 *   - kaynak İLK parçadır, kısaltma kabul edilir ("Mat" → "Matematik");
 *   - aralık ilk parçadan SONRAKİ herhangi bir parçadaki ilk "X-Y"dir;
 *   - "5 Test" gibi ADET bilgisi aralık sayılmaz (nereden nereye
 *     olduğunu söylemiyor).
 * Ayrıştırma bir ÖNERİDİR: koçun elle bağladığı (task.sourceId) her
 * zaman önce gelir.
 */

function tokens(text: string): string[] {
  return normalize(text)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * "kafadengi mat" ~ "kafadengi matematik": parçadaki her kelime
 * kaynaktaki aynı sıradaki kelimenin ÖNEKİ. Kaynak adından fazla
 * kelime varsa eşleşmez (yanlış pozitif yerine eşleşmeme).
 */
function nameMatches(segment: string, name: string): boolean {
  const a = tokens(segment);
  const b = tokens(name);
  if (a.length === 0 || a.length > b.length) return false;
  // İlk kelime tam olmalı ("Kafa" → "Kafadengi" eşleşmesin).
  if (a[0] !== b[0]) return false;
  return a.every((t, i) => b[i].startsWith(t));
}

export function matchSource(segment: string, sources: readonly Source[]): Source | null {
  const key = tokens(segment).join(" ");
  if (!key) return null;
  // Önce takma adın TAM eşleşmesi, sonra ad önek eşleşmesi.
  for (const s of sources) {
    if (s.aliases.some((a) => tokens(a).join(" ") === key)) return s;
  }
  const hits = sources.filter((s) => nameMatches(segment, s.title));
  // Birden çok kaynak eşleşiyorsa en kısa ad (en özgül) kazanır.
  hits.sort((x, y) => tokens(x.title).length - tokens(y.title).length);
  return hits[0] ?? null;
}

const RANGE = /(\d{1,5})\s*[-–—]\s*(\d{1,5})/;

export function parseRange(segments: readonly string[]): { from: number; to: number } | null {
  for (const seg of segments) {
    const m = seg.match(RANGE);
    if (!m) continue;
    const from = Number(m[1]);
    const to = Number(m[2]);
    if (from >= 1 && to >= from) return { from, to };
  }
  return null;
}

export interface SourceLink {
  sourceId: string;
  range: { from: number; to: number } | null;
  /** Elle mi bağlandı, başlıktan mı çıkarıldı. */
  manual: boolean;
}

/** Görevin etkin kaynak bağı: önce elle bağlama, sonra başlık. */
export function linkTask(task: Task, sources: readonly Source[]): SourceLink | null {
  const segments = task.title.split("|").map((s) => s.trim());

  if (task.sourceId) {
    const manualRange =
      task.rangeFrom != null && task.rangeTo != null ? { from: task.rangeFrom, to: task.rangeTo } : null;
    return {
      sourceId: task.sourceId,
      range: manualRange ?? parseRange(segments.slice(1)),
      manual: true,
    };
  }

  if (segments.length < 2) return null;
  const source = matchSource(segments[0], sources);
  if (!source) return null;
  return { sourceId: source.id, range: parseRange(segments.slice(1)), manual: false };
}

/**
 * Kaynağa bağlanmamış ama kaynak görevi gibi duran başlıklar:
 * "|" ile bölünmüş ve "Rutin" ile başlamayan. Koç bunları tek tıkla
 * bağlar.
 */
export function looksLikeSourceTask(title: string): boolean {
  const segments = title.split("|").map((s) => s.trim()).filter(Boolean);
  if (segments.length < 2) return false;
  return !normalize(segments[0]).startsWith("rutin");
}
