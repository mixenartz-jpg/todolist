"use client";

import { useRef } from "react";
import { resultSummary } from "@/features/results/format";
import { formatShortDate } from "@/lib/ui/tr";
import { cn } from "@/lib/ui/cn";
import type { DateStr } from "@/lib/date/types";
import { UNIT_COLOR, UNIT_COLOR_LABEL } from "./ui";
import type { UnitColor, UnitState } from "./unitStatus";

/** Kutucuk ipucu: durum, tarih, görev + sonuç ya da işaret notu. */
export function unitTooltip(st: UnitState, unitLabel: string): string {
  const parts = [`${st.number}. ${unitLabel}: ${UNIT_COLOR_LABEL[st.color]}${st.manual ? " (elle)" : ""}`];
  if (st.date) parts.push(formatShortDate(st.date as DateStr));
  if (st.task) {
    parts.push(st.task.title);
    const summary = st.result ? resultSummary(st.result) : "";
    if (summary) parts.push(summary);
  }
  if (st.note) parts.push(`Not: ${st.note}`);
  return parts.join("\n");
}

/** Aynı renkteki ardışık birimler (aralık çubuğu için). */
export function colorRuns(states: readonly UnitState[]) {
  const runs: Array<{ from: number; to: number; color: UnitColor; manual: boolean; first: UnitState }> = [];
  for (const st of states) {
    const last = runs[runs.length - 1];
    if (last && last.color === st.color && last.manual === st.manual && last.to === st.number - 1) last.to = st.number;
    else runs.push({ from: st.number, to: st.number, color: st.color, manual: st.manual, first: st });
  }
  return runs;
}

/**
 * Test kutucukları. Seçim (tık, shift+tık) ve kutucuk menüsü verilirse
 * etkin; verilmezse salt okunur.
 */
export function TestGrid({
  states,
  selected,
  onPick,
  onMenu,
  draggableFree = false,
}: {
  states: readonly UnitState[];
  selected?: ReadonlySet<number>;
  /** Boş (gri/kırmızı) kutucuklar sürüklenebilir; `data-unit` taşır. */
  draggableFree?: boolean;
  /** shift: aralık seçimi. */
  onPick?: (n: number, shift: boolean) => void;
  /** Sağ tık / uzun basma. */
  onMenu?: (n: number, anchor: HTMLElement) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Testler">
      {states.map((st) => (
        <li key={st.number}>
          <UnitBox
            st={st}
            selected={selected?.has(st.number) ?? false}
            onPick={onPick}
            onMenu={onMenu}
            draggable={draggableFree && (st.color === "gray" || st.color === "red")}
          />
        </li>
      ))}
    </ul>
  );
}

function UnitBox({
  st,
  selected,
  onPick,
  onMenu,
  draggable,
}: {
  st: UnitState;
  selected: boolean;
  draggable: boolean;
  onPick?: (n: number, shift: boolean) => void;
  onMenu?: (n: number, anchor: HTMLElement) => void;
}) {
  const interactive = Boolean(onPick);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const filled = st.color !== "gray";
  return (
    <button
      type="button"
      disabled={!interactive}
      draggable={draggable || undefined}
      data-unit={st.number}
      title={unitTooltip(st, "test")}
      aria-pressed={interactive ? selected : undefined}
      aria-label={unitTooltip(st, "test").split("\n")[0]}
      onClick={(e) => onPick?.(st.number, e.shiftKey)}
      onContextMenu={(e) => {
        if (!onMenu) return;
        e.preventDefault();
        onMenu(st.number, e.currentTarget);
      }}
      onTouchStart={(e) => {
        if (!onMenu) return;
        const el = e.currentTarget;
        pressTimer.current = setTimeout(() => onMenu(st.number, el), 500);
      }}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      className={cn(
        "relative grid h-7 min-w-7 place-items-center rounded-md px-1 text-[length:var(--text-2xs)] font-medium tabular-nums",
        "disabled:cursor-default",
        filled ? "text-[var(--color-on-accent)]" : "text-[var(--color-ink-2)]",
        selected && "outline-2 outline-offset-1 outline-[var(--color-accent)]",
      )}
      style={{ background: UNIT_COLOR[st.color] }}
    >
      {st.number}
      {st.manual && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 grid size-3 place-items-center rounded-full bg-[var(--color-surface)] text-[8px] leading-none text-[var(--color-ink)]"
        >
          ✎
        </span>
      )}
    </button>
  );
}

/** Soru/sayfa/ders: segmentli aralık çubuğu. */
export function RangeBar({
  states,
  unitLabel,
  onSegment,
}: {
  states: readonly UnitState[];
  unitLabel: string;
  onSegment?: (from: number, to: number) => void;
}) {
  const runs = colorRuns(states);
  const total = states.length || 1;
  return (
    <div>
      <div className="flex h-5 overflow-hidden rounded-md bg-[var(--color-surface-3)]">
        {runs.map((r) => {
          const label = `${r.from === r.to ? r.from : `${r.from}-${r.to}`} ${unitLabel}: ${UNIT_COLOR_LABEL[r.color]}${r.manual ? " (elle)" : ""}`;
          const tip = r.first.task ? `${label}\n${unitTooltip(r.first, unitLabel).split("\n").slice(1).join("\n")}` : label;
          return (
            <button
              key={r.from}
              type="button"
              disabled={!onSegment}
              title={tip}
              aria-label={label}
              onClick={() => onSegment?.(r.from, r.to)}
              className="h-full border-r border-[var(--color-surface)] last:border-r-0 disabled:cursor-default"
              style={{ width: `${((r.to - r.from + 1) / total) * 100}%`, background: UNIT_COLOR[r.color] }}
            />
          );
        })}
      </div>
      <div className="mt-0.5 flex justify-between text-[length:var(--text-2xs)] tabular-nums text-[var(--color-ink-3)]">
        <span>{states[0]?.number}</span>
        <span>{states[states.length - 1]?.number}</span>
      </div>
    </div>
  );
}
