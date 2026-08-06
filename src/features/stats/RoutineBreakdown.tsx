"use client";

import { slotVar } from "@/lib/ui/colors";
import { formatPercent, streakLabel } from "@/lib/ui/tr";
import { describeSchedule, scheduleAt } from "@/features/routines/schedule";
import type { DateStr } from "@/lib/date/types";
import type { RoutineSummary } from "./aggregate";
import "./breakdown.css";

/**
 * Rutin dökümü — tablo + satır içi ölçüm çubuğu.
 *
 * Neden tablo, neden çok serili bir grafik değil: rutin sayısı 8'i
 * aşabilir ve hepsi anlam taşır. Sekizden fazla kategorik renk renk
 * körlüğü kontrollerini geçemez; ayrıca burada okunmak istenen şey
 * "hangi rutin ne kadar" — bu bir sıralama sorusu, tablo tam da bunun
 * için var. Çubuklar tek hue ve rutinin kendi kimlik renginde: uzunluk
 * karşılaştırmayı, renk kimliği taşır.
 */
export function RoutineBreakdown({
  summaries,
  today,
}: {
  summaries: RoutineSummary[];
  today: DateStr;
}) {
  if (summaries.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <h2 className="text-[length:var(--text-base)] font-medium">Rutinler</h2>
        <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          Bu aralıkta izlenen bir rutin yok.
        </p>
      </section>
    );
  }

  // En yüksek orandan düşüğe: "hangisi iyi gidiyor" sorusunun cevabı
  // ilk satırda olsun.
  const sorted = [...summaries].sort((a, b) => b.rate - a.rate);

  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <h2 className="mb-3 text-[length:var(--text-base)] font-medium">Rutinler</h2>

      {/* Tablo semantiği korunur ama düzen mobilde dikeye döner:
          `min-width` ile yatay kaydırmaya zorlamak, kullanıcının
          göremediği sütunlarda sayı bırakır — kaydırılabilir olduğu
          fark edilmez ve veriler kayıp sanılır. */}
      <div className="routineTable">
        <table className="w-full text-[length:var(--text-sm)]">
          <caption className="sr-only">
            Rutinlerin seçili aralıktaki tamamlanma oranları ve serileri
          </caption>
          <thead>
            <tr className="border-b border-[var(--color-line)]">
              <th scope="col" className="pb-2 text-left font-medium text-[var(--color-ink-3)]">
                Rutin
              </th>
              <th scope="col" className="pb-2 text-right font-medium text-[var(--color-ink-3)]">
                Tamamlanma
              </th>
              <th scope="col" className="pb-2 pl-4 text-right font-medium text-[var(--color-ink-3)]">
                Seri
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((summary) => {
              const { routine, rate, done, expected, streak, total } = summary;
              const color = slotVar(routine.colorSlot);
              const schedule = scheduleAt(routine, today);

              return (
                <tr key={routine.id} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="truncate">{routine.name}</span>
                    </div>
                    <div className="mt-0.5 pl-4 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                      {schedule ? describeSchedule(schedule) : "—"}
                      {total !== null && routine.unit
                        ? ` · toplam ${trimNumber(total)} ${routine.unit}`
                        : ""}
                    </div>
                  </td>

                  <td data-label="Tamamlanma" className="py-2.5 align-middle">
                    <div className="flex-1">
                      <div className="flex items-center justify-end gap-2.5">
                        {/* Ölçüm çubuğu: aynı hue'nun soluk zemini üstünde
                            dolu kısım. Uzunluk karşılaştırma kanalı. */}
                        <div
                          className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
                          role="presentation"
                        >
                          <div
                            className="h-full rounded-full transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out-quart)]"
                            style={{
                              width: `${Math.round(Math.min(rate, 1) * 100)}%`,
                              background: color,
                            }}
                          />
                        </div>

                        <span className="tabular w-9 shrink-0 text-right">
                          {formatPercent(rate)}
                        </span>
                      </div>

                      <div className="tabular mt-0.5 text-right text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                        {done}/{expected}
                      </div>
                    </div>
                  </td>

                  <td data-label="Seri" className="py-2.5 pl-4 text-right align-middle">
                    <span
                      className="tabular"
                      style={{
                        color:
                          streak.current > 0 ? "var(--color-ink)" : "var(--color-ink-3)",
                      }}
                    >
                      {/* Birim daima yazılır: esnek rutinlerde seri
                          hafta/ay ile sayılır, birimsiz sayı yanıltır. */}
                      {streakLabel(streak.current, streak.unit)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function trimNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}
