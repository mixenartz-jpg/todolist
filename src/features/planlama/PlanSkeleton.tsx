import type { PlanScale } from "./range";
import "./planlama.css";

/** Ay iskeletinin hafta satırı sayısı — beş hafta tipik bir aydır. */
const MONTH_WEEKS = 5;

/**
 * Izgaranın yüklenme iskeleti.
 *
 * Ay dalı gerçek yerleşimi taklit eder: hafta satırları ve masaüstünde
 * 20rem kutular (`.planMonthDay` ile aynı boy). Kare hücreler
 * çizseydi veri gelince gözle görülür bir yeniden akış olurdu.
 *
 * Mobilde kutu boyu SABİT DEĞİL, içerik kadar uzuyor — iskeletin
 * oradaki boyu bir tahmindir. Boş bir günün gerçek yüksekliğini
 * (başlık + hızlı ekleme) seçmek, en yaygın durumda sıçramayı sıfıra
 * indirir; dolu günlerde biraz açılmak kaçınılmaz.
 */
export function PlanSkeleton({ scale }: { scale: PlanScale }) {
  if (scale === "week") {
    return (
      <div className="planWeekGrid" aria-hidden>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
            style={{ animationDelay: `${i * 30}ms` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="planMonthWeeks" aria-hidden>
      {Array.from({ length: MONTH_WEEKS }).map((_, week) => (
        <div key={week} className="planMonthWeek">
          {Array.from({ length: 7 }).map((_, day) => (
            <div
              key={day}
              className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-2)] md:h-80"
              style={{ animationDelay: `${(week * 7 + day) * 20}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
