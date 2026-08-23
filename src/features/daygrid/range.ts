/**
 * Izgaranın çizdiği saat penceresi.
 *
 * ── Neden 24 saat DEĞİL? ──
 * Bu ekranın önceki hali (`DaySchedule`) orantılı çizelgeyi reddederken
 * haklı bir şey söylüyordu: "orantılı bir çizelge 09:00 ile 17:00
 * arasındaki boşluğu yüzlerce piksel hiçliğe çevirir". İtiraz doğru ama
 * hedefi yanlıştı — sorun orantılılık değil, GEREKÇESİZ 24 SATIR.
 * 24 × 56px = 1344px eder ve bunun ilk 480 pikseli her gün boş uykudur;
 * kullanıcı uygulamayı her açtığında oradan kaydırarak çıkar.
 *
 * Pencere içeriğe göre daralır: 08:00–22:00 tabanı (784px, tek ekranda
 * neredeyse tamamı) ve yalnızca o günde gerçekten iş varsa uçlara doğru
 * açılır. Sabit bir 08:00 tabanı gece çalışan biri için keyfîdir — ama
 * onun 02:00'deki görevi pencereyi zaten aşağı açar, yani kural kendi
 * istisnasını üretir.
 */

import { DAY_END_MINUTES, endMinutes, parseTime } from "@/features/tasks/schedule";
import type { Task } from "@/features/tasks/types";
import { DEFAULT_DURATION } from "./geometry";

export interface HourWindow {
  /** İlk dakika, tam saate hizalı. */
  startMinute: number;
  /** Son dakika, tam saate hizalı ve DIŞLAYICI. */
  endMinute: number;
}

/** Hiçbir saatli görev yokken gösterilen pencere: 08:00–22:00. */
export const DEFAULT_WINDOW: HourWindow = {
  startMinute: 8 * 60,
  endMinute: 22 * 60,
};

/** Tüm günü gösteren pencere — "Tüm günü göster" düğmesinin karşılığı. */
export const FULL_WINDOW: HourWindow = {
  startMinute: 0,
  endMinute: DAY_END_MINUTES,
};

export interface VisibleWindowOptions {
  /**
   * "Şimdi", gün başından dakika. Verilirse pencereye dahil edilir:
   * görünmeyen bir "şimdi çizgisi"nin hiçbir anlamı yoktur.
   */
  now?: number | null;
  /** true → 00:00–24:00, içerik ne olursa olsun. */
  expanded?: boolean;
}

/**
 * Gösterilecek saat aralığını hesaplar.
 *
 * Varsayılan pencereden başlar ve GEREKTİĞİ KADAR genişler; asla
 * daralmaz. Genişleme daima tam saate yuvarlanır — yarım saatte
 * başlayan bir ızgaranın oluk etiketleri okunmaz olur.
 */
export function visibleWindow(
  tasks: readonly Task[],
  options: VisibleWindowOptions = {},
): HourWindow {
  if (options.expanded) return FULL_WINDOW;

  let start = DEFAULT_WINDOW.startMinute;
  let end = DEFAULT_WINDOW.endMinute;

  for (const task of tasks) {
    if (!task.startTime) continue;
    const taskStart = parseTime(task.startTime);
    if (taskStart === null) continue;

    // Süresiz görev de yer kaplar (bkz. DEFAULT_DURATION gerekçesi).
    const taskEnd = endMinutes(taskStart, task.durationMinutes ?? DEFAULT_DURATION);

    if (taskStart < start) start = floorToHour(taskStart);
    if (taskEnd > end) end = ceilToHour(taskEnd);
  }

  const now = options.now;
  if (now !== null && now !== undefined) {
    if (now < start) start = floorToHour(now);
    if (now > end) end = ceilToHour(now);
  }

  return {
    startMinute: Math.max(0, start),
    endMinute: Math.min(DAY_END_MINUTES, end),
  };
}

/**
 * Penceredeki tam saat sınırları — oluk etiketleri ve yatay çizgiler.
 *
 * Son sınır DIŞLANIR: 08:00–22:00 penceresinde son etiket 21:00'dir,
 * çünkü 22:00 çizgisi tuvalin alt kenarının kendisidir ve orada bir
 * etiket taşacak yer bulamaz.
 */
export function hourMarks(w: HourWindow): number[] {
  const out: number[] = [];
  for (let m = w.startMinute; m < w.endMinute; m += 60) out.push(m);
  return out;
}

function floorToHour(minute: number): number {
  return Math.floor(minute / 60) * 60;
}

function ceilToHour(minute: number): number {
  return Math.ceil(minute / 60) * 60;
}
