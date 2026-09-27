"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { addDays } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatWeekRange } from "@/lib/ui/tr";
import type { WeekMoveTarget } from "./nodeMutations";
import { useWeekGoals } from "./queries";
import type { WeekGoal } from "./types";

/** Seçicide gösterilen hafta aralığı: kaynak haftanın ±bu kadar. */
const WEEK_SPAN = 6;
const NEW = "__new__";

interface NodeWeekMovePanelProps {
  /** Dalların şu an ait olduğu haftalık hedef. */
  source: WeekGoal;
  /** Taşınacak paket (dal) sayısı — yalnızca başlık için. */
  packageCount: number;
  pending: boolean;
  onMove: (target: WeekMoveTarget, weekLabel: string) => void;
  onCancel: () => void;
}

/**
 * Seçili dalları başka bir haftanın hedefine taşıma paneli.
 *
 * İki seçim: HAFTA, sonra o haftanın HEDEFİ. Hedef haftada aynı adlı
 * bir hedef varsa o seçili gelir ("Kimya" haftadan haftaya sürüyor);
 * yoksa aynı adla YENİ hedef açılır — kullanıcının önce öbür haftaya
 * gidip hedefi elle yazması gerekmesin.
 */
export function NodeWeekMovePanel({
  source,
  packageCount,
  pending,
  onMove,
  onCancel,
}: NodeWeekMovePanelProps) {
  const [week, setWeek] = useState<DateStr>(() => addDays(source.weekStart, 7));
  const [choice, setChoice] = useState<string | null>(null);

  const weeksQuery = useWeekGoals(week);
  const candidates = useMemo(
    () => (weeksQuery.data ?? []).filter((g) => g.id !== source.id),
    [weeksQuery.data, source.id],
  );

  // Seçilmemişse: aynı adlı hedef, yoksa yeni hedef.
  const sameTitle = candidates.find(
    (g) => g.title.trim().toLocaleLowerCase("tr") ===
      source.title.trim().toLocaleLowerCase("tr"),
  );
  const effective =
    choice !== null && (choice === NEW || candidates.some((g) => g.id === choice))
      ? choice
      : (sameTitle?.id ?? NEW);

  const weeks = useMemo(() => {
    const out: { value: DateStr; label: string }[] = [];
    for (let offset = -WEEK_SPAN; offset <= WEEK_SPAN; offset += 1) {
      const start = addDays(source.weekStart, offset * 7);
      const range = formatWeekRange(start, addDays(start, 6));
      const hint =
        offset === 0
          ? " (bu hedefin haftası)"
          : offset === 1
            ? " (sonraki hafta)"
            : offset === -1
              ? " (önceki hafta)"
              : "";
      out.push({ value: start, label: `${range}${hint}` });
    }
    return out;
  }, [source.weekStart]);

  const weekLabel = formatWeekRange(week, addDays(week, 6));

  function submit() {
    const target: WeekMoveTarget =
      effective === NEW
        ? {
            kind: "new",
            weekStart: week,
            title: source.title,
            colorSlot: source.colorSlot,
            planGoalId: source.planGoalId,
          }
        : { kind: "existing", weekGoalId: effective };
    onMove(target, weekLabel);
  }

  return (
    <div className="sticky bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+0.75rem)] md:bottom-3 z-[var(--z-sticky)] mt-4 flex flex-col gap-2.5 rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-overlay)]">
      <p className="tabular text-[length:var(--text-sm)] font-medium">
        {packageCount} dalı başka haftaya taşı
      </p>

      <label className="flex flex-col gap-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        Hangi hafta?
        <select
          value={week}
          onChange={(event) => {
            setWeek(event.target.value as DateStr);
            setChoice(null);
          }}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-[length:var(--text-sm)] text-[var(--color-ink)]"
        >
          {weeks.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        Hangi hedefin altına?
        <select
          value={effective}
          disabled={weeksQuery.isPending}
          onChange={(event) => setChoice(event.target.value)}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-[length:var(--text-sm)] text-[var(--color-ink)]"
        >
          {candidates.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
          <option value={NEW}>＋ Yeni hedef: {source.title}</option>
        </select>
      </label>

      <div className="flex gap-2">
        <Button
          size="sm"
          loading={pending}
          disabled={weeksQuery.isPending}
          onClick={submit}
        >
          Taşı
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
