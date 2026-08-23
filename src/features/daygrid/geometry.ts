/**
 * Zaman ızgarasının ölçü matematiği — piksel ile dakika arasındaki çeviri.
 *
 * Izgaranın TEK ölçü birimi bir saatlik satırın yüksekliğidir; blok
 * konumu, blok yüksekliği, tuval yüksekliği ve sürükleme hit-test'i
 * hepsi ondan türetilir. Bu modül React'ten ve DOM'dan bağımsızdır:
 * `hourHeight` dışarıdan verilir (CSS'ten okunur, bkz. DayGridCanvas),
 * böylece 768px kırılmasında satır yüksekliği değişince matematik
 * kendiliğinden uyar ve iki yerde iki farklı sabit tutulmaz.
 */

import { DAY_END_MINUTES } from "@/features/tasks/schedule";

export interface GridMetrics {
  /** Bir saatlik satırın piksel yüksekliği (--daygrid-hour-h). */
  hourHeight: number;
  /** Görünür pencerenin ilk dakikası (ör. 480 = 08:00). */
  startMinute: number;
  /** Görünür pencerenin son dakikası, dışlayıcı (ör. 1320 = 22:00). */
  endMinute: number;
}

/**
 * Saati olmayan ya da süresi verilmemiş bir görevin varsayılan süresi.
 *
 * Süresiz görev ızgarada YER KAPLAMALI: 0 dakikalık bir blok 0 piksel
 * yüksekliğinde çizilir, tıklanamaz ve sürüklenemez olur.
 */
export const DEFAULT_DURATION = 30;

/** En kısa süre. Snap adımıyla aynı: daha kısası zaten seçilemez. */
export const MIN_DURATION = 15;

/** Sürükleme ve tıklamanın yuvarlandığı adım, dakika. */
export const SNAP_STEP = 15;

/** Dakika → tuvalin tepesinden piksel. Pencere dışı değer de döner. */
export function minuteToY(minute: number, m: GridMetrics): number {
  return ((minute - m.startMinute) / 60) * m.hourHeight;
}

/** Piksel → dakika. Ham, yuvarlanmamış. */
export function yToMinute(y: number, m: GridMetrics): number {
  return m.startMinute + (y / m.hourHeight) * 60;
}

/** Tuvalin toplam yüksekliği, piksel. */
export function canvasHeight(m: GridMetrics): number {
  return ((m.endMinute - m.startMinute) / 60) * m.hourHeight;
}

/**
 * En yakın `step` katına yuvarlar.
 *
 * Sürükleme, boyutlandırma ve boş yuva tıklaması ÜÇÜ DE buradan geçer.
 * Üç yerde ayrı ayrı `Math.round(x / 15) * 15` yazmak, üçünün zamanla
 * ayrışmasına davetiyedir.
 */
export function snapMinutes(minute: number, step: number = SNAP_STEP): number {
  return Math.round(minute / step) * step;
}

/**
 * Taşınan bir bloğun başlangıcını pencereye ve gün sonuna sığdırır.
 *
 * Süre verilirse blok gün sonunu AŞAMAZ ve bu durumda başlangıç geriye
 * itilir — süre KISALTILMAZ. Gerekçe: taşımak bir süre düzenlemesi
 * değildir; kullanıcı 2 saatlik bir bloğu gecenin sonuna sürüklediğinde
 * beklediği şey bloğun sığdığı son yere oturması, sessizce 20 dakikaya
 * inmesi değil.
 */
export function clampStart(
  start: number,
  duration: number | null,
  m: GridMetrics,
): number {
  const span = duration ?? 0;
  // Üst sınır iki kısıttan küçüğü: pencerenin sonu ve günün sonu.
  // Pencere gün sonundan önce bitiyorsa blok görünmez bir yere düşemez.
  const latest = Math.min(m.endMinute, DAY_END_MINUTES) - span;
  return Math.max(m.startMinute, Math.min(start, Math.max(m.startMinute, latest)));
}

/**
 * Boyutlandırmada süreyi sınırlar.
 *
 * Taban MIN_DURATION, tavan gün sonuna kalan süre — `endMinutes`
 * (schedule.ts) ile aynı kırpma kuralı: bir gün planı ertesi güne
 * taşmamalı.
 */
export function clampDuration(
  start: number,
  duration: number,
  m: GridMetrics,
): number {
  const available = Math.min(m.endMinute, DAY_END_MINUTES) - start;
  return Math.max(MIN_DURATION, Math.min(duration, Math.max(MIN_DURATION, available)));
}
