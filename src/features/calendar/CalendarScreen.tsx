"use client";

import { useMemo, useState } from "react";
import { todayStr, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { WEEKDAYS_MIN } from "@/lib/ui/tr";
import { Toast, useToast } from "@/components/Toast";
import { EMPTY_ENTRIES, useEntries } from "@/features/entries/queries";
import { useRoutines } from "@/features/routines/queries";
import { scoreRange } from "@/features/stats/score";
import { useTasks } from "@/features/tasks/queries";
import { MonthSwitcher } from "@/features/matrix/MonthSwitcher";
import { CalendarDayCell } from "./CalendarDayCell";
import { DayDetailSheet } from "./DayDetailSheet";
import { monthGrid } from "./grid";
import "./calendar.css";

export function CalendarScreen() {
  const today = useMemo(() => todayStr(), []);
  const currentMonth = useMemo(() => {
    const { year, month } = toParts(today);
    return { year, month };
  }, [today]);

  const [month, setMonth] = useState(currentMonth);
  const [selected, setSelected] = useState<DateStr | null>(null);
  const toast = useToast();

  const cells = useMemo(() => monthGrid(month.year, month.month), [month]);

  // Izgara komşu aylara taşar; sorgu aralığı ilk ve son hücreyi kapsar
  // ki taşan günlerin yoğunluğu da doğru görünsün.
  const rangeStart = cells[0].date;
  const rangeEnd = cells[cells.length - 1].date;

  const routinesQuery = useRoutines();
  const entriesQuery = useEntries(rangeStart, rangeEnd);
  const tasksQuery = useTasks();

  const entries = entriesQuery.data ?? EMPTY_ENTRIES;

  const scores = useMemo(
    // `?? []` memo'nun İÇİNDE: dışarıda her render yeni bir dizi
    // üretir ve bağımlılık her seferinde değişmiş sayılır.
    () => scoreRange(entries, routinesQuery.data ?? [], rangeStart, rangeEnd),
    [entries, routinesQuery.data, rangeStart, rangeEnd],
  );

  /** Hangi günlerde tamamlanmamış görev var? */
  const taskDays = useMemo(() => {
    const set = new Set<string>();
    for (const task of tasksQuery.data ?? []) {
      if (task.dueDate && !task.done) set.add(task.dueDate);
    }
    return set;
  }, [tasksQuery.data]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MonthSwitcher
        year={month.year}
        month={month.month}
        onChange={setMonth}
        onToday={() => setMonth(currentMonth)}
        isCurrentMonth={
          month.year === currentMonth.year && month.month === currentMonth.month
        }
      />

      <div className="mx-auto w-full max-w-3xl flex-1 px-3 py-4 md:px-6 md:py-5">
        <div className="calendarGrid mb-1.5" role="presentation">
          {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => (
            <div
              key={day}
              className="pb-1 text-center text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--color-ink-3)]"
            >
              {WEEKDAYS_MIN[day]}
            </div>
          ))}
        </div>

        <div
          className="calendarGrid"
          role="grid"
          aria-label={`${month.year} ${month.month}. ay takvimi`}
        >
          {cells.map(({ date, inMonth }) => (
            <CalendarDayCell
              key={date}
              date={date}
              inMonth={inMonth}
              isToday={date === today}
              isFuture={date > today}
              score={scores.get(date) ?? { earned: 0, possible: 0, ratio: 0 }}
              hasTask={taskDays.has(date)}
              onSelect={() => setSelected(date)}
            />
          ))}
        </div>
      </div>

      {selected && (
        <DayDetailSheet
          date={selected}
          today={today}
          onClose={() => setSelected(null)}
          onError={toast.show}
        />
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
