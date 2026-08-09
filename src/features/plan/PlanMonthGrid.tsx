"use client";

import { toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { WEEKDAYS_MIN } from "@/lib/ui/tr";
import type { PlanBucket } from "./plan";
import "./plan.css";

interface PlanMonthGridProps {
  buckets: readonly PlanBucket[];
  today: DateStr;
  /** Havuzdan seçili görev varsa hücreler yerleştirme hedefi olur. */
  placing: boolean;
  onSelect: (date: DateStr) => void;
}

/**
 * Ay ölçeğinin ızgarası.
 *
 * ── Neden görev BAŞLIKLARI yok? ──
 * 42 kare hücreye görev satırı sığmaz; 320px'de hücre ~40px eder.
 * Hücre "bu günde kaç iş var" sorusunu cevaplar, "hangileri" sorusunu
 * panel cevaplar. Başlıkları kırpıp göstermek her ikisini de yarım
 * yapardı — okunmayan bir metin ve kaybolan bir sayı.
 *
 * Takvim ekranının ızgarasından AYRI: orada hücre rutin yoğunluğunu
 * gösteriyor, burada görev sayısını. Ortak bir bileşene zorlamak, iki
 * farklı sorunun aynı kutuya sıkıştırılması olurdu.
 */
export function PlanMonthGrid({
  buckets,
  today,
  placing,
  onSelect,
}: PlanMonthGridProps) {
  return (
    <div>
      <div className="planMonthGrid mb-1" aria-hidden>
        {WEEKDAYS_MIN.slice(1).map((day) => (
          <div
            key={day}
            className="py-1 text-center text-[length:var(--text-2xs)] text-[var(--color-ink-3)]"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="planMonthGrid" role="grid" aria-label="Ay planı">
        {buckets.map((bucket) => (
          <PlanMonthCell
            key={bucket.date}
            bucket={bucket}
            isToday={bucket.date === today}
            placing={placing}
            onSelect={() => onSelect(bucket.date)}
          />
        ))}
      </div>
    </div>
  );
}

function PlanMonthCell({
  bucket,
  isToday,
  placing,
  onSelect,
}: {
  bucket: PlanBucket;
  isToday: boolean;
  placing: boolean;
  onSelect: () => void;
}) {
  const day = toParts(bucket.date).day;

  /*
   * Etiket sayıyı KELİMEYLE söyler. Hücrede rakam görsel olarak
   * yeterli ama ekran okuyucuya "5 3" diye okunurdu — hangisi gün,
   * hangisi iş sayısı belli olmazdı.
   */
  const label = [
    `${day}`,
    bucket.openCount > 0 ? `${bucket.openCount} iş` : "iş yok",
    isToday ? "bugün" : null,
    placing ? "bu güne koy" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "planMonthCell",
        !bucket.inScope && "planMonthCellOutside",
        isToday && "planMonthCellToday",
        placing && "planMonthCellTarget",
      )}
    >
      <span
        className={cn(
          "tabular text-[length:var(--text-sm)] leading-none",
          isToday && "font-medium text-[var(--color-accent)]",
        )}
      >
        {day}
      </span>

      {/* Sıfırken hiç gösterilmez: "0" bir bilgi değil, gürültüdür ve
          42 hücrede tekrarlanırdı. */}
      {bucket.openCount > 0 && (
        <span className="tabular rounded-full bg-[var(--color-surface-3)] px-1.5 text-[length:var(--text-2xs)] leading-[1.5] text-[var(--color-ink-2)]">
          {bucket.openCount}
        </span>
      )}

      {/* Tamamlanmış iş varsa sessiz bir iz. Renk tek başına bilgi
          taşımıyor: sayı zaten yukarıda ve etikette yazıyor. */}
      {bucket.openCount === 0 && bucket.doneCount > 0 && (
        <span
          aria-hidden
          className="size-1 rounded-full bg-[var(--color-good)]"
        />
      )}
    </button>
  );
}
