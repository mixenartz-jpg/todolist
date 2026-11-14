/**
 * Günlük formun seçenekleri. Veritabanı yalnızca İNDEKS tutar
 * (`study_bucket`, `screen_bucket`); etiketler burada. Etiket metnini
 * değiştirmek geçmiş veriyi bozmaz, SIRAYI değiştirmek bozar —
 * yeni seçenek yalnızca SONA eklenir.
 */

/** 0 → "0–1 sa", 9 → "9–10 sa", 10 → "10+ sa" */
export const STUDY_BUCKETS: readonly string[] = [
  ...Array.from({ length: 10 }, (_, i) => `${i}–${i + 1} sa`),
  "10+ sa",
];

/** Ortalama hesaplarında kovanın orta noktası (dakika). */
export function studyBucketMinutes(index: number): number {
  return index >= 10 ? 10.5 * 60 : (index + 0.5) * 60;
}

export const SCREEN_BUCKETS: readonly string[] = [
  "0–30 dk",
  "30 dk–1 sa",
  "1–2 sa",
  "2–3 sa",
  "3–4 sa",
  "4–5 sa",
  "5+ sa",
];

export const ENERGY_LABELS: Record<number, string> = {
  1: "Çok düşük",
  2: "Düşük",
  3: "Orta",
  4: "İyi",
  5: "Çok iyi",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 15 dk adımlı saat listesi; `from`dan başlayıp `count` adım. */
export function timeOptions(fromHour: number, hours: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < hours * 4; i++) {
    const total = fromHour * 60 + i * 15;
    const h = Math.floor(total / 60) % 24;
    out.push(`${pad(h)}:${pad(total % 60)}`);
  }
  return out;
}

/** Uyuma: 20:00 → 05:45. */
export const SLEEP_OPTIONS = timeOptions(20, 10);
/** Uyanma: 04:00 → 13:45. */
export const WAKE_OPTIONS = timeOptions(4, 10);
