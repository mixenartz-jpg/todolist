"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { addDays } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatWeekRange } from "@/lib/ui/tr";
import type { WeekGoal } from "./types";

/** Seçicide gösterilen hafta aralığı: görüntülenen haftanın ±bu kadar. */
const WEEK_SPAN = 6;

interface WeekGoalMovePanelProps {
  goals: readonly WeekGoal[];
  /** Görüntülenen hafta — kaynak. */
  weekStart: DateStr;
  pending: boolean;
  onMove: (ids: string[], to: DateStr) => void;
  onCancel: () => void;
}

/**
 * Haftanın hedeflerini başka bir haftaya TOPLU taşıma paneli.
 *
 * Varsayılan seçim: TAMAMLANMAMIŞ hedeflerin hepsi, hedef: sonraki
 * hafta. En sık istek "bitmeyenleri gelecek haftaya aktar" ve bu tek
 * tıkla yapılabilmeli. Tamamlananlar seçili gelmez — bitirdiğin hedef
 * kendi haftasında kalmalı ki o haftada neyi bitirdiğini görebilesin.
 */
export function WeekGoalMovePanel({
  goals,
  weekStart,
  pending,
  onMove,
  onCancel,
}: WeekGoalMovePanelProps) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(goals.filter((g) => g.completedAt === null).map((g) => g.id)),
  );
  const [target, setTarget] = useState<DateStr>(() => addDays(weekStart, 7));

  const weeks = useMemo(() => {
    const out: { value: DateStr; label: string }[] = [];
    for (let offset = -WEEK_SPAN; offset <= WEEK_SPAN; offset += 1) {
      if (offset === 0) continue;
      const start = addDays(weekStart, offset * 7);
      const range = formatWeekRange(start, addDays(start, 6));
      const hint =
        offset === 1 ? " (sonraki hafta)" : offset === -1 ? " (önceki hafta)" : "";
      out.push({ value: start, label: `${range}${hint}` });
    }
    return out;
  }, [weekStart]);

  const allSelected = goals.length > 0 && selected.size === goals.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-2 rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[length:var(--text-sm)] font-medium">
          Hedefleri başka haftaya taşı
        </p>
        <button
          type="button"
          onClick={() =>
            setSelected(allSelected ? new Set() : new Set(goals.map((g) => g.id)))
          }
          className="text-[length:var(--text-xs)] text-[var(--color-accent)] hover:underline"
        >
          {allSelected ? "Hiçbirini seçme" : "Hepsini seç"}
        </button>
      </div>

      <ul className="flex flex-col gap-1">
        {goals.map((goal) => (
          <li key={goal.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[length:var(--text-sm)] hover:bg-[var(--color-surface-2)]">
              <input
                type="checkbox"
                checked={selected.has(goal.id)}
                onChange={() => toggle(goal.id)}
                className="size-4 accent-[var(--color-accent)]"
              />
              <span
                className={
                  goal.completedAt !== null
                    ? "text-[var(--color-ink-3)] line-through"
                    : undefined
                }
              >
                {goal.title}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <label className="mt-3 block">
        <span className="mb-1 block text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
          Hangi haftaya?
        </span>
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value as DateStr)}
          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-[length:var(--text-sm)]"
        >
          {weeks.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          disabled={pending || selected.size === 0}
          onClick={() =>
            // Ekrandaki sırayı koru: hedef haftada da aynı dizilişle
            // sona eklensinler.
            onMove(
              goals.filter((g) => selected.has(g.id)).map((g) => g.id),
              target,
            )
          }
        >
          {selected.size > 0 ? `${selected.size} hedefi taşı` : "Taşı"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
