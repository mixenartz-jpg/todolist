"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  asDateStr,
  endOfMonth,
  isoWeekday,
  monthDays,
  startOfMonth,
  todayStr,
  toParts,
} from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatMonthYear, formatLongDate, formatProgress } from "@/lib/ui/tr";
import { cellState, nextValue, valueOn } from "@/features/entries/completion";
import { EMPTY_ENTRIES, useEntries } from "@/features/entries/queries";
import { useSetEntry } from "@/features/entries/mutations";
import { useRoutines } from "@/features/routines/queries";
import type { RoutineWithSchedule } from "@/features/routines/types";
import { dayScore } from "@/features/stats/score";
import { keyToAction, matrixFocusReducer, type FocusPosition } from "./keyboard";
import { MatrixCell } from "./MatrixCell";
import { MatrixNameCell } from "./MatrixNameCell";
import { MatrixHeader } from "./MatrixHeader";
import { MatrixScoreRow } from "./MatrixScoreRow";
import { MonthSwitcher } from "./MonthSwitcher";
import { EmptyState } from "@/components/EmptyState";
import { Toast, useToast } from "@/components/Toast";
import { GridIcon } from "@/components/icons";
import "./matrix.css";

interface YearMonth {
  year: number;
  month: number;
}

function toMonth(date: DateStr): YearMonth {
  const { year, month } = toParts(date);
  return { year, month };
}

export function MatrixScreen() {
  const today = useMemo(() => todayStr(), []);
  const currentMonth = useMemo(() => toMonth(today), [today]);
  const [month, setMonth] = useState<YearMonth>(currentMonth);
  const [focus, setFocus] = useState<FocusPosition>({ row: 0, col: 0 });

  const gridRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const days = useMemo(
    () => monthDays(month.year, month.month),
    [month.year, month.month],
  );
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

  const routinesQuery = useRoutines();
  const entriesQuery = useEntries(rangeStart, rangeEnd);

  const entries = entriesQuery.data ?? EMPTY_ENTRIES;
  const routines = useMemo(
    () => (routinesQuery.data ?? []).filter((r) => visibleInMonth(r, rangeStart, rangeEnd)),
    [routinesQuery.data, rangeStart, rangeEnd],
  );

  const setEntry = useSetEntry(toast.show);

  /**
   * Ayın tamamının hücre durumu tek seferde hesaplanır. Hücreler
   * hiçbir predicate çağırmaz — sadece verilen durumu boyar.
   */
  const cells = useMemo(
    () =>
      routines.map((r) =>
        days.map((date) => ({
          state: cellState(entries, r, date, today),
          value: valueOn(entries, r, date),
        })),
      ),
    [routines, days, entries, today],
  );

  const scores = useMemo(
    () => days.map((date) => dayScore(entries, routines, date)),
    [days, routines, entries],
  );

  const bounds = useMemo(
    () => ({ rows: routines.length, cols: days.length }),
    [routines.length, days.length],
  );

  /** Hücre değerini ilerletir. */
  const toggleCell = useCallback(
    (routineId: string, date: DateStr) => {
      const routine = routines.find((r) => r.id === routineId);
      if (!routine) return;

      const current = valueOn(entries, routine, date);
      setEntry.mutate({
        routineId,
        date,
        value: nextValue(current, routine.target),
      });
    },
    [routines, entries, setEntry],
  );

  /**
   * Tek delege tıklama dinleyicisi. 465 ayrı React işleyicisi yerine
   * ızgarada bir tane — hücreler prop olarak fonksiyon almadığı için
   * memo karşılaştırması primitif kalır.
   */
  const handleGridClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]");
      if (!cell) return;

      const routineId = cell.dataset.routineId;
      const date = cell.dataset.date;
      if (!routineId || !date) return;

      const row = routines.findIndex((r) => r.id === routineId);
      const col = days.indexOf(asDateStr(date));
      if (row >= 0 && col >= 0) setFocus({ row, col });

      toggleCell(routineId, asDateStr(date));
    },
    [routines, days, toggleCell],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (bounds.rows === 0) return;

      const modifiers = { ctrl: event.ctrlKey, meta: event.metaKey };
      const action = keyToAction(event.key, modifiers);

      if (action) {
        event.preventDefault();
        setFocus((current) => matrixFocusReducer(current, action, bounds));
        return;
      }

      const routine = routines[focus.row];
      const date = days[focus.col];
      if (!routine || !date) return;

      // Değer değiştiren tuşlar
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        toggleCell(routine.id, date);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        setEntry.mutate({ routineId: routine.id, date, value: 0 });
        return;
      }

      if (event.key === "+" || event.key === "-") {
        event.preventDefault();
        const step = event.key === "+" ? 1 : -1;
        const next = Math.max(0, valueOn(entries, routine, date) + step);
        setEntry.mutate({ routineId: routine.id, date, value: next });
        return;
      }

      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault();
        setEntry.mutate({
          routineId: routine.id,
          date,
          value: Number(event.key),
        });
        return;
      }

      // Bugüne atla
      if (event.key === "t" || event.key === "T") {
        const todayIndex = days.indexOf(today);
        if (todayIndex >= 0) {
          event.preventDefault();
          setFocus((current) =>
            matrixFocusReducer(current, { type: "toColumn", col: todayIndex }, bounds),
          );
        }
      }
    },
    [bounds, routines, days, focus, entries, today, toggleCell, setEntry],
  );

  // Odak değişince ilgili hücreye gerçek DOM odağı ver.
  useEffect(() => {
    if (bounds.rows === 0) return;
    const routine = routines[focus.row];
    const date = days[focus.col];
    if (!routine || !date) return;

    const selector = `[data-routine-id="${routine.id}"][data-date="${date}"]`;
    const cell = gridRef.current?.querySelector<HTMLElement>(selector);
    if (cell && document.activeElement !== cell && gridRef.current?.contains(document.activeElement)) {
      cell.focus();
    }
  }, [focus, routines, days, bounds.rows]);

  // Açılışta bugünün sütununu görünür yap.
  useEffect(() => {
    const index = days.indexOf(today);
    if (index < 0) return;

    const scroller = gridRef.current?.closest<HTMLElement>(".matrixScroll");
    const cell = gridRef.current?.querySelector<HTMLElement>(`[data-date="${today}"]`);
    if (scroller && cell) {
      scroller.scrollLeft = Math.max(0, cell.offsetLeft - scroller.clientWidth / 2);
    }
    // Yalnızca ay değiştiğinde çalışsın.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month.year, month.month]);

  const isLoading = routinesQuery.isPending;
  const error = routinesQuery.error ?? entriesQuery.error;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MonthSwitcher
        year={month.year}
        month={month.month}
        onChange={setMonth}
        onToday={() => setMonth(currentMonth)}
        isCurrentMonth={isSameMonth(month, currentMonth)}
      />

      {error && (
        <p role="alert" className="px-5 py-3 text-[length:var(--text-sm)] text-[var(--color-danger)]">
          Veriler yüklenemedi: {error.message}
        </p>
      )}

      {isLoading ? (
        <MatrixSkeleton />
      ) : routines.length === 0 ? (
        <EmptyState
          icon={<GridIcon size={22} />}
          title="Henüz rutin yok"
          description="Takip etmek istediğin ilk rutini ekle — her gün, haftanın belirli günleri veya haftada birkaç kez olabilir."
          actionLabel="Rutin ekle"
          actionHref="/rutinler"
        />
      ) : (
        <div className="matrixScroll min-h-0 w-full min-w-0 flex-1">
          <div
            ref={gridRef}
            role="grid"
            aria-label={`${formatMonthYear(month.year, month.month)} rutin tablosu`}
            aria-rowcount={routines.length + 2}
            aria-colcount={days.length + 1}
            className="matrixGrid"
            style={{ ["--days" as string]: days.length }}
            onClick={handleGridClick}
            onKeyDown={handleKeyDown}
          >
            <MatrixHeader days={days} today={today} />

            {routines.map((routine, row) => (
              <MatrixRow
                key={routine.id}
                routine={routine}
                row={row}
                days={days}
                today={today}
                entries={entries}
                cells={cells[row]}
                focus={focus}
              />
            ))}

            <MatrixScoreRow days={days} scores={scores} today={today} />
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </div>
  );
}

/** Bir rutinin satırı. Fragment döndürür — grid tek katman kalır. */
function MatrixRow({
  routine,
  row,
  days,
  today,
  entries,
  cells,
  focus,
}: {
  routine: RoutineWithSchedule;
  row: number;
  days: DateStr[];
  today: DateStr;
  entries: ReturnType<typeof useEntries>["data"] extends infer T ? NonNullable<T> : never;
  cells: Array<{ state: ReturnType<typeof cellState>; value: number }>;
  focus: FocusPosition;
}) {
  return (
    <>
      <MatrixNameCell routine={routine} entries={entries} today={today} />

      {days.map((date, col) => {
        const cell = cells[col];
        return (
          <MatrixCell
            key={date}
            routineId={routine.id}
            date={date}
            state={cell.state}
            value={cell.value}
            target={routine.target}
            colorSlot={routine.colorSlot}
            isToday={date === today}
            isWeekStart={isoWeekday(date) === 1}
            isWeekend={isoWeekday(date) >= 6}
            isFocused={focus.row === row && focus.col === col}
            label={cellLabel(routine, date, cell.value)}
          />
        );
      })}
    </>
  );
}

function cellLabel(
  routine: RoutineWithSchedule,
  date: DateStr,
  value: number,
): string {
  const progress = formatProgress(value, routine.target, routine.unit);
  return `${routine.name}, ${formatLongDate(date)}: ${progress}`;
}

/** Rutin bu ayda görünmeli mi? Arşivlenmiş ve hiç kesişmeyenler gizlenir. */
function visibleInMonth(
  r: RoutineWithSchedule,
  from: DateStr,
  to: DateStr,
): boolean {
  if (r.startDate > to) return false;
  if (r.archivedAt !== null && r.archivedAt <= from) return false;
  return true;
}

function isSameMonth(
  a: { year: number; month: number },
  b: { year: number; month: number },
): boolean {
  return a.year === b.year && a.month === b.month;
}

function MatrixSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-2 p-5" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-8 animate-pulse rounded bg-[var(--color-surface-2)]"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

export { startOfMonth, endOfMonth };
