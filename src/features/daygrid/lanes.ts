/**
 * Çakışan görevleri yan yana şeritlere paketler.
 *
 * Aynı saate iki iş koymak bir hata değil, sık bir durumdur; ızgara
 * bunları üst üste çizerse alttaki tamamen kaybolur. Google Takvim'in
 * çözümü blokları yan yana daraltmaktır ve burada da o yapılıyor —
 * ama SADELEŞTİRİLMİŞ haliyle: bloklar birbirinin üstüne kısmen
 * bindirilmez, alanı tam bölüşürler. Bindirme, bir bloğun nerede bitip
 * diğerinin nerede başladığını belirsizleştirir.
 */

import { endMinutes, parseTime, splitDaySchedule } from "@/features/tasks/schedule";
import type { Task } from "@/features/tasks/types";
import { DEFAULT_DURATION } from "./geometry";

export interface LaneItem {
  task: Task;
  startMinute: number;
  /** Dışlayıcı bitiş. Süresiz görevlerde DEFAULT_DURATION kadar. */
  endMinute: number;
  /** 0-tabanlı şerit indeksi. */
  lane: number;
  /** Bu bloğun ait olduğu KÜMEDEKİ toplam şerit sayısı. */
  laneCount: number;
}

/**
 * Saatli görevleri çakışmayan şeritlere dağıtır.
 *
 * Girdi sırasından bağımsız, deterministik sonuç verir: sıralama
 * `splitDaySchedule`'a devredilir (saat → sortOrder → id). O sıralama
 * zaten test edilmiş ve Bugün/Hafta/Planlama ekranlarının tamamında
 * kullanılıyor; burada ikinci bir sıralama kuralı üretmek iki ekranın
 * aynı günü farklı sırada göstermesi demek olurdu.
 */
export function packLanes(tasks: readonly Task[]): LaneItem[] {
  const { timed } = splitDaySchedule(tasks);

  const spans = timed.map((task) => {
    const start = parseTime(task.startTime!)!;
    return {
      task,
      startMinute: start,
      endMinute: endMinutes(start, task.durationMinutes ?? DEFAULT_DURATION),
    };
  });

  const out: LaneItem[] = [];

  /*
   * Küme (cluster) = zincirleme çakışan görevler öbeği. Kümeler
   * birbirinden BAĞIMSIZ hesaplanır: sabah 09:00'daki bir çakışma
   * akşam 17:00'deki yalnız bloğu daraltmamalı, yoksa tüm gün o günün
   * en kalabalık anına göre sıkışır ve ızgara boş yerde dar görünür.
   */
  let clusterStart = 0;
  let clusterEnd = -1;

  for (let i = 0; i <= spans.length; i++) {
    const span = spans[i];

    // Küme kapanıyor: ya liste bitti ya da yeni görev kümeye değmiyor.
    if (span === undefined || (clusterEnd >= 0 && span.startMinute >= clusterEnd)) {
      assignCluster(spans.slice(clusterStart, i), out);
      clusterStart = i;
      clusterEnd = -1;
    }

    if (span === undefined) break;
    clusterEnd = Math.max(clusterEnd, span.endMinute);
  }

  return out;
}

type Span = { task: Task; startMinute: number; endMinute: number };

/**
 * Tek bir kümedeki görevlere şerit atar — greedy interval partitioning.
 *
 * Her şerit için o şeridin şu ana kadarki en büyük bitişi tutulur; yeni
 * görev, bitişi kendi başlangıcını geçmeyen İLK şeride girer. Sıralı
 * girdide bu, minimum şerit sayısını garanti eder.
 */
function assignCluster(spans: readonly Span[], out: LaneItem[]): void {
  if (spans.length === 0) return;

  /** lanes[i] = i numaralı şeridin son bitiş dakikası. */
  const lanes: number[] = [];
  const assigned: number[] = [];

  for (const span of spans) {
    let lane = lanes.findIndex((end) => end <= span.startMinute);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(span.endMinute);
    } else {
      lanes[lane] = span.endMinute;
    }
    assigned.push(lane);
  }

  /*
   * `laneCount` kümenin TÜM üyelerine aynı yazılır. Her bloğa kendi
   * anındaki şerit sayısını vermek blokları farklı genişliklerde
   * bırakır ve ızgara basamaklı, dağınık görünür.
   */
  const laneCount = lanes.length;
  for (let i = 0; i < spans.length; i++) {
    out.push({ ...spans[i], lane: assigned[i], laneCount });
  }
}

/** Şeridin yatay konumu, yüzde. Alanı tam bölüşürler — bindirme yok. */
export function laneGeometry(item: LaneItem): {
  leftPct: number;
  widthPct: number;
} {
  const width = 100 / item.laneCount;
  return { leftPct: item.lane * width, widthPct: width };
}
