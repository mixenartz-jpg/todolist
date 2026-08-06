"use client";

import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import { streakLabel } from "@/lib/ui/tr";
import type { RoutineWithSchedule } from "@/features/routines/types";
import type { StreakResult } from "./streak";

interface StreakCardProps {
  routine: RoutineWithSchedule;
  streak: StreakResult;
  /** Son günlerin geçmişi — kartın altındaki mini şerit. */
  history: Array<{ date: DateStr; due: boolean; done: boolean }>;
}

/**
 * Bir rutinin seri kartı.
 *
 * Birim MUTLAKA yazılır: esnek rutinlerde seri hafta/ay ile sayılır ve
 * birimsiz bir "5" kullanıcı tarafından gün sanılır.
 *
 * Sayı `tabular-nums` KULLANMAZ — eşit genişlikli rakamlar büyük
 * puntoda gevşek görünür. Tabular yalnızca dikey hizalanan sütunlarda
 * (tablo satırları, eksen etiketleri) kullanılır.
 */
export function StreakCard({ routine, streak, history }: StreakCardProps) {
  const color = slotVar(routine.colorSlot);
  const isActive = streak.current > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span className="truncate text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {routine.name}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className="text-[2rem] font-semibold leading-none tracking-[-0.02em]"
          style={{ color: isActive ? color : "var(--color-ink-3)" }}
        >
          {streak.current}
        </span>
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {unitNoun(streak)}
        </span>
      </div>

      <History history={history} color={color} />

      <div className="flex items-center justify-between text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        <span>En uzun</span>
        <span className="tabular">{streakLabel(streak.longest, streak.unit)}</span>
      </div>
    </div>
  );
}

/**
 * Son günlerin şeridi.
 *
 * Zorunlu olmayan günler soluk bir çizgi, zorunlu-yapılmamış günler
 * boş kutu, yapılanlar dolu kutu. Renk tek başına bilgi taşımasın
 * diye şekil de farklıdır.
 */
function History({
  history,
  color,
}: {
  history: StreakCardProps["history"];
  color: string;
}) {
  return (
    <div className="flex items-center gap-[3px]" aria-hidden>
      {history.map(({ date, due, done }) => (
        <span
          key={date}
          className={cn(
            "h-4 flex-1 rounded-[2px]",
            !due && !done && "h-1 self-center",
          )}
          style={{
            background: done
              ? color
              : due
                ? "transparent"
                : "var(--color-line)",
            border: due && !done ? "1px solid var(--color-line-2)" : undefined,
          }}
        />
      ))}
    </div>
  );
}

function unitNoun(streak: StreakResult): string {
  const noun =
    streak.unit === "day" ? "gün" : streak.unit === "week" ? "hafta" : "ay";
  return streak.current > 0 ? noun : `${noun} · seri yok`;
}
