"use client";

import { memo } from "react";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import { describeSchedule, scheduleAt } from "@/features/routines/schedule";
import type { RoutineWithSchedule } from "@/features/routines/types";
import type { PeriodProgress } from "@/features/stats/score";
import "@/components/list-motion.css";

interface TodayRoutineItemProps {
  routine: RoutineWithSchedule;
  date: DateStr;
  value: number;
  completed: boolean;
  /** Esnek rutinse dönem ilerlemesi, değilse null. */
  progress: PeriodProgress | null;
  onToggle: () => void;
  onStep: (delta: number) => void;
}

/**
 * Bugün ekranındaki tek rutin satırı.
 *
 * Matristen farkı: burası tek elle, telefonda, hızlıca işaretlemek
 * için. Dokunma hedefleri büyük (satırın tamamı basılabilir), sayısal
 * rutinlerde artır/azalt düğmeleri var.
 */
export const TodayRoutineItem = memo(function TodayRoutineItem({
  routine,
  date,
  value,
  completed,
  progress,
  onToggle,
  onStep,
}: TodayRoutineItemProps) {
  const color = slotVar(routine.colorSlot);
  const isNumeric = routine.target > 1;
  const schedule = scheduleAt(routine, date);
  const ratio = routine.target > 0 ? Math.min(value / routine.target, 1) : 0;

  return (
    <li
      className={cn(
        "rowEnter relative flex items-center gap-3 rounded-xl border px-3 py-3",
        "transition-colors duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
        completed
          ? "border-transparent bg-[var(--color-surface-2)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)]",
      )}
    >
      {/* Sayısal rutinlerde ilerleme, satırın ALT KENARINDA ince bir
          şerit olarak. Zemini renklendirmek metni boğuyor ve satırı
          "seçili" gibi gösteriyordu — ilerleme bir vurgu değil, bir
          ölçüm. */}
      {isNumeric && value > 0 && !completed && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-b-xl"
        >
          <span
            className="block h-full transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out-quart)]"
            style={{ width: `${Math.round(ratio * 100)}%`, background: color }}
          />
        </span>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={completed}
        aria-label={
          completed
            ? `${routine.name}: tamamlandı, geri al`
            : `${routine.name}: tamamlandı işaretle`
        }
        className="relative grid size-11 shrink-0 place-items-center rounded-lg transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
      >
        <span
          /* `key`: her işaretlemede eleman yeniden takılır, onay
             animasyonu yeniden oynar. */
          key={completed ? "done" : "todo"}
          className={cn(
            "grid size-7 place-items-center rounded-lg transition-colors duration-[var(--duration-fast)]",
            completed && "markPop",
          )}
          style={
            completed
              ? { background: color }
              : { border: `1.5px solid color-mix(in oklch, ${color} 55%, transparent)` }
          }
        >
          {completed && <CheckGlyph />}
        </span>
      </button>

      <div className="relative min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-[length:var(--text-lg)] transition-colors duration-[var(--duration-fast)]",
            completed ? "text-[var(--color-ink-2)]" : "text-[var(--color-ink)]",
          )}
        >
          {routine.name}
        </div>

        <div className="mt-0.5 flex items-center gap-2 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          {isNumeric && (
            <span className="tabular" style={{ color: value > 0 ? color : undefined }}>
              {value}/{routine.target}
              {routine.unit ? ` ${routine.unit}` : ""}
            </span>
          )}

          {progress && (
            <span
              className="tabular"
              style={{ color: progress.complete ? color : undefined }}
            >
              Bu {progress.per === "week" ? "hafta" : "ay"} {progress.done}/
              {progress.target}
            </span>
          )}

          {!isNumeric && !progress && schedule && (
            <span>{describeSchedule(schedule)}</span>
          )}
        </div>
      </div>

      {isNumeric && (
        <div className="relative flex shrink-0 items-center gap-1">
          <StepButton
            label={`${routine.name}: bir azalt`}
            disabled={value <= 0}
            onClick={() => onStep(-1)}
          >
            −
          </StepButton>
          <StepButton label={`${routine.name}: bir artır`} onClick={() => onStep(1)}>
            +
          </StepButton>
        </div>
      )}
    </li>
  );
});

function StepButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        // 36px görsel boyut; ::before ile dokunma alanı 44px'e çıkar.
        // Küçük düğmeler telefonda ıskalanır.
        "relative grid size-9 place-items-center rounded-lg border border-[var(--color-line-2)]",
        "before:absolute before:-inset-1 before:content-['']",
        "text-[length:var(--text-lg)] text-[var(--color-ink-2)]",
        "transition-[color,background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
        "hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink)]",
        // Devre dışı düğme görünür kalmalı: %35'te tamamen kayboluyor
        // ve düğmenin orada olduğu anlaşılmıyordu.
        "active:scale-[0.97] disabled:opacity-55 disabled:hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 6.2l2.4 2.4L9.5 4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
