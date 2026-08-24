"use client";

import { useCallback } from "react";
import { isoWeekday } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { WEEKDAYS_LONG, WEEKDAYS_SHORT } from "@/lib/ui/tr";
import { DayGridScreen, type DraftSlot } from "@/features/daygrid/DayGridScreen";
import { useDropDispatch } from "@/features/daygrid/useDropDispatch";
import { DEFAULT_DURATION } from "@/features/daygrid/geometry";
import { taskColorSlot } from "@/features/tasks/color";
import { formatTime } from "@/features/tasks/schedule";
import type { Task } from "@/features/tasks/types";
import type { PlanTaskActions } from "./usePlanTaskActions";
import type { Category } from "./types";
import "./planGrid.css";

interface PlanWeekTimeGridProps {
  dates: readonly DateStr[];
  today: DateStr;
  /** Filtre UYGULANMIŞ, aralık içi görevler — gerekçe aşağıda. */
  tasks: readonly Task[];
  categoryById: ReadonlyMap<string, Category>;
  actions: PlanTaskActions;
  /** Havuzdan seçili görev var — günler yerleştirme hedefi olur. */
  placing: boolean;
  onPlace: (date: DateStr) => void;
  onOpen: (task: Task, anchor: DOMRect) => void;
  onError: (message: string) => void;
}

/**
 * Haftalık planlamanın zaman ızgarası görünümü.
 *
 * `DayGridScreen`'i Planlama ekranına bağlayan ADAPTÖR — ızgaranın
 * kendisi Bugün ekranındakiyle birebir aynı bileşendir. İki ekranın
 * ayrı ızgara yazması, sürükleme ve şerit davranışlarının sessizce
 * ayrışması demekti.
 *
 * ── `tasks` neden ham veri DEĞİL? ──
 * Çağıran `range.buckets`'tan düzleştirilmiş listeyi verir. Kategori
 * filtresi `buildPlanRange`'e GİRERKEN uygulanıyor (bkz. filter.ts);
 * buraya `tasksQuery.data` verilseydi filtre listede çalışır, ızgarada
 * sessizce çalışmazdı — ve bu, kullanıcının fark etmesi zor bir
 * tutarsızlık olurdu.
 */
export function PlanWeekTimeGrid({
  dates,
  today,
  tasks,
  categoryById,
  actions,
  placing,
  onPlace,
  onOpen,
  onError,
}: PlanWeekTimeGridProps) {
  const handleDrop = useDropDispatch(onError);

  const colorOf = useCallback(
    (task: Task) =>
      taskColorSlot(task, (id) => categoryById.get(id)?.colorSlot),
    [categoryById],
  );

  const handleCreate = useCallback(
    (title: string, slot: DraftSlot) => {
      actions.onAddAt(
        title,
        slot.date,
        formatTime(slot.startMinute),
        DEFAULT_DURATION,
      );
    },
    [actions],
  );

  return (
    <div>
      {/*
        Yerleştirme şeridi.

        `DayGridScreen`'in İÇİNE değil ÜSTÜNE konuyor: yerleştirme modu
        Planlama'ya özgü bir kavram (havuz) ve ızgara bileşenini ondan
        haberdar etmek, Bugün ekranına hiç kullanmadığı bir prop
        taşımak olurdu.

        `PlanDayRow`'un `planDropStrip`'iyle aynı dil — kullanıcı için
        "havuzdan bir güne koymak" iki görünümde de aynı hareket.
      */}
      {placing && (
        <div className="mb-1.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))` }}>
          {dates.map((date) => (
            <button
              key={date}
              type="button"
              aria-label={`${WEEKDAYS_LONG[isoWeekday(date)]} gününe koy`}
              onClick={() => onPlace(date)}
              className="planDropStrip truncate text-center"
            >
              <span aria-hidden className="text-[length:var(--text-xs)]">
                ＋ {WEEKDAYS_SHORT[isoWeekday(date)]}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="planGridScroll">
        <DayGridScreen
          dates={dates}
          today={today}
          tasks={tasks}
          colorOf={colorOf}
          onOpen={onOpen}
          onCreate={handleCreate}
          onDrop={handleDrop}
        />
      </div>
    </div>
  );
}
