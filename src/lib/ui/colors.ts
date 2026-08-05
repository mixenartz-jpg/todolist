/**
 * Rutin kimlik renkleri ve yoğunluk rampası.
 *
 * Her iki set de `dataviz` doğrulayıcısından geçmiştir (koyu yüzey
 * #111318): renk körlüğü ayrımı ΔE 8.4, normal görüş ΔE 19.3, tüm
 * slotlar ≥3:1 kontrast; rampa tek hue, monoton açıklık, komşu adımlar
 * arası görünür fark.
 *
 * Slot SIRASI renk körlüğü güvenliğinin mekanizmasıdır — kozmetik
 * değildir ve değiştirilmemelidir. Renk rutinin KİMLİĞİNİ takip eder;
 * sırasını değil. Bir rutin silinince diğerlerinin rengi değişmez.
 */

export const SLOT_COUNT = 8;

/** CSS değişken adı — inline style için. */
export function slotVar(slot: number): string {
  return `var(--color-slot-${((slot % SLOT_COUNT) + SLOT_COUNT) % SLOT_COUNT})`;
}

/** Ham hex — yalnızca CSS değişkeninin kullanılamadığı yerlerde. */
export const SLOT_HEX = [
  "#3987e5", // 0 mavi
  "#d95926", // 1 turuncu
  "#199e70", // 2 turkuaz
  "#c98500", // 3 sarı
  "#d55181", // 4 magenta
  "#008300", // 5 yeşil
  "#9085e9", // 6 mor
  "#e66767", // 7 kırmızı
] as const;

export const SLOT_NAMES = [
  "Mavi",
  "Turuncu",
  "Turkuaz",
  "Sarı",
  "Pembe",
  "Yeşil",
  "Mor",
  "Kırmızı",
] as const;

/** Yoğunluk rampası CSS değişkeni (0-4). */
export function levelVar(level: 0 | 1 | 2 | 3 | 4): string {
  return `var(--color-level-${level})`;
}
