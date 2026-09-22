import { endOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { chunkWeeks, type PlanBucket } from "./range";

/**
 * Ay ölçeğinin yeni anlamı: HAFTA HARİTASI.
 *
 * ── Neden gün hücresi yok? ──
 * Ay ızgarası kırk iki gün satırı çiziyordu ve bunların otuz beşi
 * "bugün değil" diye sönük duruyordu. Kullanıcı gerçekte haftalar
 * halinde planlıyor; aydan beklediği şey "hangi hafta ne kadar dolu"
 * — kırk iki satırlık bir liste değil.
 *
 * Aynı satırı iki ölçekte çizmek zaten `PlanGrid`'in varlık
 * sebebiydi; o bileşen bu yüzden emekli oldu. Hafta ölçeği günleri
 * çizer, ay ölçeği HAFTALARI. İkisi artık farklı sorulara cevap
 * veriyor ve bu yüzden ikisi de var.
 *
 * ── Bir haftaya basmak o haftaya GÖTÜRÜR ──
 * Harita bir gezinme yüzeyi: ay "nereye bakayım" sorusunu, hafta
 * "ne yapayım" sorusunu cevaplıyor. Haritada iş yapılamaz olması bir
 * eksiklik değil, ayrımın kendisi.
 */

/** Haritadaki tek hafta satırı. */
export interface WeekSummary {
  /** Haftanın Pazartesi'si — `setAnchor` bununla çağrılır. */
  weekStart: DateStr;
  weekEnd: DateStr;
  openCount: number;
  doneCount: number;
  /**
   * Bu hafta görüntülenen AYA ait mi?
   *
   * `monthGrid` komşu aylardan taşan günler getiriyor; ayın ilk ve
   * son haftası kısmen başka aya düşebilir. Tamamen dışarıda kalan
   * bir hafta olmaz (aksi hâlde ızgaraya girmezdi) ama kısmen
   * dışarıda olan haftalar soluk çizilir — `PlanBucket.inScope`'un
   * hafta ölçeğindeki karşılığı.
   */
  inScope: boolean;
  /** Bu haftada bugün var mı? Haritada "buradasın" işareti. */
  hasToday: boolean;
}

/**
 * Gün kovalarını hafta özetlerine indirger.
 *
 * ── Sayaçlar neden TOPLANMIŞ, yeniden hesaplanmış değil? ──
 * `openCount`/`doneCount` `buildPlanRange`'de zaten hesaplandı ve
 * kategori filtresi ORAYA girerken uygulandı (bkz. filter.ts). Burada
 * görevleri yeniden saymak, filtreyi ikinci kez uygulamayı
 * hatırlamayı gerektirirdi — unutulduğu gün harita filtreye uymayan
 * sayılar gösterirdi.
 */
export function weekSummaries(
  buckets: readonly PlanBucket[],
  today: DateStr,
): WeekSummary[] {
  return chunkWeeks(buckets)
    .map((week) => {
      const first = week[0];
      if (first === undefined) return null;

      return {
        weekStart: first.date,
        /*
         * Bitiş `week[week.length - 1]`'den DEĞİL, `endOfIsoWeek`'ten
         * alınır. `chunkWeeks` son satırı kısa döndürebiliyor
         * (yorumu bunu yazıyor) ve o durumda bitiş Perşembe'ye
         * düşerdi — ekranda "14 – 17 Eylül" diye eksik bir hafta.
         */
        weekEnd: endOfIsoWeek(first.date),
        openCount: week.reduce((sum, b) => sum + b.openCount, 0),
        doneCount: week.reduce((sum, b) => sum + b.doneCount, 0),
        // Haftanın EN AZ BİR günü aydaysa hafta aya aittir. Tümünü
        // şart koşmak, ayın ilk ve son haftasını daima soluk
        // gösterirdi — halbuki onlar da o ayın haftaları.
        inScope: week.some((b) => b.inScope),
        hasToday: week.some((b) => b.date === today),
      };
    })
    .filter((w): w is WeekSummary => w !== null);
}

/**
 * Haritadaki en yoğun haftanın iş sayısı — çubukların ölçeği.
 *
 * `null` değil `0` dönmez: sıfır dönseydi çağıran sıfıra bölerdi.
 * Hiç iş yoksa `1` döner ve tüm çubuklar boş çizilir — doğru sonuç,
 * özel dal gerektirmeden.
 */
export function enYogunHafta(haftalar: readonly WeekSummary[]): number {
  const enCok = Math.max(0, ...haftalar.map((w) => w.openCount + w.doneCount));
  return enCok === 0 ? 1 : enCok;
}
