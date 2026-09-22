import type { PlanScale } from "./range";
import "./planlama.css";

/** Ay haritasının satır sayısı — beş hafta tipik bir aydır. */
const MONTH_WEEKS = 5;

/**
 * Plan yüzeyinin yüklenme iskeleti.
 *
 * Gerçek yerleşimi taklit eder: aynı kağıt, aynı tarih kanalı, aynı
 * satır yüksekliği. Başka bir şekil çizseydi veri gelince gözle
 * görülür bir yeniden akış olurdu.
 *
 * ── İki ölçek, İKİ AYRI iskelet ──
 * Ölçekler artık aynı şeyi farklı aralıkta değil, farklı ŞEYLER
 * çiziyor: hafta gün satırları, ay hafta özetleri. Tek iskelet
 * kullanılsaydı ay ölçeğinde kırk iki gün satırı vaat edilir, gelen
 * beş hafta satırı olurdu — iskeletin varlık sebebine aykırı.
 */
export function PlanSkeleton({ scale }: { scale: PlanScale }) {
  return scale === "week" ? <HaftaIskeleti /> : <AyIskeleti />;
}

/**
 * Hafta ölçeği — yedi gün satırı.
 *
 * ── Satır yüksekliği neden boş günün boyu? ──
 * Haftanın çoğu gün boştur; en yaygın durumu seçmek sıçramayı
 * çoğunlukta sıfıra indirir. Dolu günlerde biraz açılmak kaçınılmaz
 * ve doğru olan da bu: iskelet bir söz verir, gerçeğinden büyük
 * olmamalı.
 */
function HaftaIskeleti() {
  return (
    <div className="planSheet" aria-hidden>
      {Array.from({ length: 7 }).map((_, day) => (
        <div key={day} className="planDayRow">
          <div className="planDayGutter">
            <span
              className="block h-4 w-5 animate-pulse rounded-[var(--r-xs)] bg-[var(--color-surface-3)]"
              style={{ animationDelay: `${day * 25}ms` }}
            />
          </div>

          <div className="planDayField">
            <span
              className="block h-9 w-full animate-pulse rounded-[var(--r-lg)] bg-[var(--color-surface-2)]"
              style={{ animationDelay: `${day * 25}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Ay ölçeği — hafta haritasının satırları (bkz. PlanMonthMap). */
function AyIskeleti() {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden>
      {Array.from({ length: MONTH_WEEKS }).map((_, week) => (
        <span
          key={week}
          /* Ölçü `HaftaSatiri` ile aynı: kenarlık + p-3 + iki satır
             içerik ≈ 68px. Farklı olsaydı harita gelince zıplardı. */
          className="block h-[68px] w-full animate-pulse rounded-xl bg-[var(--color-surface-2)]"
          style={{ animationDelay: `${week * 40}ms` }}
        />
      ))}
    </div>
  );
}
