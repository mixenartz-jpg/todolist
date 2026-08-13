import type { PlanScale } from "./range";
import "./planlama.css";

/** Ay iskeletinin hafta bölümü sayısı — beş hafta tipik bir aydır. */
const MONTH_WEEKS = 5;

/**
 * Ajanda kağıdının yüklenme iskeleti.
 *
 * Gerçek yerleşimi taklit eder: aynı kağıt, aynı tarih kanalı, aynı
 * satır yüksekliği. Başka bir şekil çizseydi veri gelince gözle
 * görülür bir yeniden akış olurdu.
 *
 * ── Satır yüksekliği neden boş günün boyu? ──
 * Ayın ~%60'ı boş; en yaygın durumu seçmek sıçramayı çoğunlukta sıfıra
 * indirir. Dolu günlerde biraz açılmak kaçınılmaz ve doğru olan da bu:
 * iskelet bir söz verir, gerçeğinden büyük olmamalı.
 */
export function PlanSkeleton({ scale }: { scale: PlanScale }) {
  const weeks = scale === "week" ? 1 : MONTH_WEEKS;

  return (
    <div className="planSheet" aria-hidden>
      {Array.from({ length: weeks }).map((_, week) => (
        <div key={week} className="planWeekSection">
          <div className="planWeekLabel">
            <span
              className="block h-3 w-28 animate-pulse rounded-[var(--r-xs)] bg-[var(--color-surface-3)]"
              style={{ animationDelay: `${week * 40}ms` }}
            />
          </div>

          {Array.from({ length: 7 }).map((_, day) => (
            <div key={day} className="planDayRow">
              <div className="planDayGutter">
                <span
                  className="block h-4 w-5 animate-pulse rounded-[var(--r-xs)] bg-[var(--color-surface-3)]"
                  style={{ animationDelay: `${(week * 7 + day) * 25}ms` }}
                />
              </div>

              <div className="planDayField">
                <span
                  className="block h-9 w-full animate-pulse rounded-[var(--r-lg)] bg-[var(--color-surface-2)]"
                  style={{ animationDelay: `${(week * 7 + day) * 25}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
