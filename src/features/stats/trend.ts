/**
 * Haftalar arası karşılaştırma — saf mantık.
 *
 * ── Neden ayrı dosya? ──
 * `weeklyTrend` haftalık oran SERİSİNİ veriyor ama karşılaştıran
 * kimse yok. Ortalama ve zirve hesabı `TrendChart.tsx`'in içine
 * gömülü: dışa açık değil, başka ekrandan çağrılamıyor ve test
 * edilemiyor — bu depoda yalnızca `.test.ts` çalışıyor, React test
 * kütüphanesi kurulu değil.
 *
 * Koçluk cümlesi ("bu hafta geçen haftadan %12 öndesin") ölçülebilir
 * bir iddiadır ve doğrulanamayan hiçbir övgü yazılmaz. Dolayısıyla
 * ölçümün kendisi testli bir yerde durmalı.
 */

import type { WeekPoint } from "./aggregate";

export interface TrendDelta {
  /** Son haftanın oranı, 0-1. */
  current: number;
  /** Ondan önceki haftanın oranı, 0-1. */
  previous: number;
  /**
   * `current - previous`. Pozitif = iyileşme.
   *
   * Oran FARKI, yüzde değişimi DEĞİL: %20'den %30'a çıkmak burada
   * +0.10'dur, "%50 artış" değil. Küçük tabanlarda yüzde değişimi
   * abartır — 1/10'dan 2/10'a çıkmak "%100 daha iyi" diye
   * okunurdu ve bu, koçun doğrulanabilir konuşma kuralını ihlal
   * ederdi.
   */
  delta: number;
}

/**
 * Son iki haftayı karşılaştırır.
 *
 * `null` döner: karşılaştıracak iki hafta yoksa. Tek haftalık veride
 * "öndesin" ya da "geridesin" demek uydurmaktır — ölçülemeyen şey
 * söylenmez.
 *
 * Dizinin SON iki elemanı alınır; `weeklyTrend` çıktısını kronolojik
 * sırada üretiyor ve burada yeniden sıralamak, iki farklı sıralama
 * kuralının sessizce ayrışabileceği bir kapı açardı.
 */
export function trendDelta(weeks: readonly WeekPoint[]): TrendDelta | null {
  if (weeks.length < 2) return null;

  const current = weeks[weeks.length - 1];
  const previous = weeks[weeks.length - 2];

  return {
    current: current.ratio,
    previous: previous.ratio,
    delta: current.ratio - previous.ratio,
  };
}
