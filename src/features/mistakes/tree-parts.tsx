"use client";

import { cn } from "@/lib/ui/cn";
import { levelVar } from "@/lib/ui/colors";
import type { Heat } from "./tree";

/**
 * Ağacın üç seviyesinde de tekrar eden parçalar.
 *
 * Isı şeridi ve sayı rozetleri ders/konu satırlarında birebir aynıdır.
 * Tek yerde durmaları, seviyeler arasında görsel kaymayı imkânsız kılar.
 *
 * Açma oku burada DEĞİL: `components/Chevron` uygulamanın ortağıdır ve
 * defter de aynısını kullanır.
 */

/**
 * Yoğunluk şeridi — satırın sol kenarında dikey çizgi.
 *
 * ── Renk TEK BAŞINA yetmez ──
 * Rampanın komşu adımları 3px'lik ince bir şeritte koyu zeminde
 * birbirine karışıyor. Bu yüzden ısı aynı anda YÜKSEKLİĞE de bindirilir:
 * en yoğun dal tam boy, en seyreği üçte bir. İki kanal birden
 * kullanmak, göstergeyi renk ayrımına bağımlı olmaktan çıkarır.
 *
 * `aria-hidden`: taşıdığı bilgi zaten sayı rozetlerinde yazılı. Şerit
 * yalnızca taramayı hızlandırır, bilgi taşımaz.
 */
const HEAT_HEIGHTS = ["0%", "34%", "56%", "78%", "100%"] as const;

export function HeatBar({ heat }: { heat: Heat }) {
  return (
    <span aria-hidden className="flex w-1 shrink-0 self-stretch items-center">
      <span
        className="w-full rounded-full transition-[height] duration-[var(--duration-base)]"
        style={{
          height: HEAT_HEIGHTS[heat],
          backgroundColor: heat === 0 ? "transparent" : levelVar(heat),
        }}
      />
    </span>
  );
}

/**
 * Vadesi gelen tekrar sayısı.
 *
 * Sıfırken HİÇ render edilmez: "0 tekrar" bilgi değil gürültüdür ve her
 * satıra bir tane koymak ağacı okunmaz yapardı.
 */
export function DueBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "tabular shrink-0 rounded-full px-1.5 py-0.5 text-[length:var(--text-2xs)] font-medium",
        "bg-[color-mix(in_oklch,var(--color-warn)_16%,transparent)] text-[var(--color-warn)]",
      )}
    >
      {count} tekrar
      <span className="sr-only"> bekliyor</span>
    </span>
  );
}

/**
 * "Bu hafta · toplam" sayıları.
 *
 * Eski çetele tablosunun iki sütunu buraya taşındı. Hafta sıfırsa "—"
 * yazılır; sıfır yazmak, gerçekten sıfır olanla hiç kayıt olmayanı
 * ayırt edilemez kılardı.
 *
 * Tire yalnızca GÖRSELDİR: ekran okuyucuya sızarsa "bu hafta em dash
 * toplam 3" diye okunurdu. Sesli sürüm sıfırı açıkça söyler.
 */
export function CountPair({ week, total }: { week: number; total: number }) {
  return (
    <span className="tabular shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
      <span className="sr-only">bu hafta {week}, toplam {total}</span>

      <span aria-hidden>
        {week > 0 ? week : "—"}
        {" · "}
        <span className="font-medium text-[var(--color-ink-2)]">{total}</span>
      </span>
    </span>
  );
}
