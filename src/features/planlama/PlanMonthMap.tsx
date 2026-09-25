"use client";

import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatWeekRange } from "@/lib/ui/tr";
import { enYogunHafta, type WeekSummary } from "./weekmap";

interface PlanMonthMapProps {
  haftalar: readonly WeekSummary[];
  /** Haftaya basınca o haftaya götürür — çapayı taşır ve ölçeği çevirir. */
  onSelectWeek: (weekStart: DateStr) => void;
}

/**
 * Ay ölçeği — HAFTA HARİTASI, gün ızgarası değil.
 *
 * ── Ne için var? ──
 * Ay "nereye bakayım" sorusunu cevaplıyor, hafta "ne yapayım"
 * sorusunu. Eskiden ay ölçeği kırk iki gün satırı çiziyordu ve
 * haftanın çizdiğiyle aynıydı — iki ölçek aynı soruyu iki kez
 * soruyordu. Şimdi ay bir harita: hangi hafta ne kadar dolu, bugün
 * hangi haftada, nereye gitmeli.
 *
 * ── Burada iş YAPILAMAZ, bu bir eksiklik değil ──
 * Haritada görev eklenmez, işaretlenmez, taşınmaz. Ayrımın kendisi
 * bu: harita bir gezinme yüzeyi. İş yapmak için bir haftaya
 * basılır ve o haftanın günleri açılır.
 */
export function PlanMonthMap({ haftalar, onSelectWeek }: PlanMonthMapProps) {
  const tavan = enYogunHafta(haftalar);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        Bir haftaya bas, o haftaya git
      </p>

      <ul className="flex flex-col gap-1.5">
        {haftalar.map((hafta) => (
          <li key={hafta.weekStart}>
            <HaftaSatiri
              hafta={hafta}
              tavan={tavan}
              onSelect={() => onSelectWeek(hafta.weekStart)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function HaftaSatiri({
  hafta,
  tavan,
  onSelect,
}: {
  hafta: WeekSummary;
  tavan: number;
  onSelect: () => void;
}) {
  const toplam = hafta.openCount + hafta.doneCount;

  return (
    <button
      type="button"
      onClick={onSelect}
      /*
       * `aria-current="date"`: bugünün haftası ekran okuyucuya da
       * bildirilmeli. Yalnızca turuncu kenarlıkla işaretlemek, rengi
       * göremeyen kullanıcıya "buradasın" demezdi.
       */
      aria-current={hafta.hasToday ? "date" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left",
        "transition-[border-color,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
        "active:scale-[0.99]",
        hafta.hasToday
          ? "border-[var(--color-accent)] bg-[var(--color-surface)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-2)] hover:bg-[var(--color-surface-2)]",
        // Komşu aya taşan hafta soluk — `PlanBucket.inScope`'un
        // hafta ölçeğindeki karşılığı.
        !hafta.inScope && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[length:var(--text-sm)] font-medium">
          {formatWeekRange(hafta.weekStart, hafta.weekEnd)}
          {hafta.hasToday && (
            <span className="rounded bg-[var(--color-accent-fill)] px-1.5 py-0.5 text-[length:var(--text-2xs)] font-medium text-[var(--color-on-accent)]">
              Bu hafta
            </span>
          )}
        </p>

        {/*
         * Yoğunluk çubuğu. `aria-hidden`: sayı zaten sağda yazılı ve
         * ekran okuyucuya iki kez aynı bilgi verilmez.
         *
         * Genişlik EN YOĞUN haftaya göre oranlanıyor, sabit bir
         * tavana göre değil: haftada üç iş yapan biri için "3" zaten
         * dolu bir hafta ve çubuğun hep boş görünmesi yanlış bir
         * sinyal olurdu.
         */}
        <span
          aria-hidden
          className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]"
        >
          {hafta.doneCount > 0 && (
            <span
              className="block h-full bg-[var(--color-accent)]"
              style={{ width: `${(hafta.doneCount / tavan) * 100}%` }}
            />
          )}
          {hafta.openCount > 0 && (
            <span
              className="block h-full bg-[var(--color-line-3)]"
              style={{ width: `${(hafta.openCount / tavan) * 100}%` }}
            />
          )}
        </span>
      </div>

      {/*
       * Sayaç: açık iş ÖNE çıkar, biten sönük. Kullanıcının "bu
       * haftada ne kaldı" sorusu "ne yaptım"dan önce geliyor.
       *
       * Hiç iş yoksa tire — "0" yazmak boş bir haftayı dolu bir
       * hafta kadar görünür kılardı.
       */}
      <span className="tabular shrink-0 text-right text-[length:var(--text-sm)]">
        {toplam === 0 ? (
          <span className="text-[var(--color-ink-3)]">—</span>
        ) : (
          <>
            <span className="font-medium text-[var(--color-ink)]">
              {hafta.openCount}
            </span>
            <span className="text-[var(--color-ink-3)]"> / {toplam}</span>
          </>
        )}
      </span>
    </button>
  );
}
