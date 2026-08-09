"use client";

import { useMemo } from "react";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatDuration, overlaps, splitDaySchedule } from "./schedule";
import { TaskItem } from "./TaskItem";
import type { Task } from "./types";

interface DayScheduleProps {
  tasks: readonly Task[];
  today: DateStr;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDefer: (task: Task) => void;
  onSetTime: (
    task: Task,
    startTime: string | null,
    durationMinutes: number | null,
  ) => void;
  onRename?: (task: Task, title: string) => void;
}

/**
 * Günün görevleri: saatliler zaman çizelgesi, saatsizler düz liste.
 *
 * ── Boşluklar ORANTILI ÇİZİLMEZ ──
 * Orantılı bir çizelge 09:00 ile 17:00 arasındaki boşluğu yüzlerce
 * piksel hiçliğe çevirir ve ekranı kaydırılamaz kılar. Satırlar sabit
 * yükseklikte, saatler etiket olarak durur.
 *
 * Saatli görev yoksa çizelge HİÇ görünmez; liste bugüne kadarki gibi
 * çalışır. Kullanıcı saat vermeden yeni bir yapı dayatılmaz.
 */
export function DaySchedule({
  tasks,
  today,
  onToggle,
  onDelete,
  onDefer,
  onSetTime,
  onRename,
}: DayScheduleProps) {
  const { timed, untimed } = useMemo(() => splitDaySchedule(tasks), [tasks]);

  // Çakışma uyarısı için: her görevin kendinden ÖNCEKİLERLE çakışıp
  // çakışmadığı. İlk görev asla işaretlenmez, işaretlenen ikinci
  // olandır — "bu, bir öncekiyle çakışıyor" demek doğru okumadır.
  const clashing = useMemo(() => {
    const set = new Set<string>();
    for (let i = 1; i < timed.length; i++) {
      for (let j = 0; j < i; j++) {
        if (overlaps(timed[i], timed[j])) {
          set.add(timed[i].id);
          break;
        }
      }
    }
    return set;
  }, [timed]);

  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {timed.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {timed.map((task) => (
            <li key={task.id} className="flex items-stretch gap-2.5">
              <div className="flex w-11 shrink-0 flex-col items-end pt-3">
                <span className="tabular text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                  {task.startTime}
                </span>
                {task.durationMinutes && (
                  <span className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
                    {formatDuration(task.durationMinutes)}
                  </span>
                )}
              </div>

              {/* Zaman çizgisi: saat sütununu görevlere bağlar ve
                  çakışmada uyarı rengine döner. */}
              <div
                aria-hidden
                className={cn(
                  "w-px shrink-0 rounded-full",
                  clashing.has(task.id)
                    ? "bg-[var(--color-warn)]"
                    : "bg-[var(--color-line)]",
                )}
              />

              <ul className="min-w-0 flex-1">
                <TaskItem
                  task={task}
                  today={today}
                  hideTime
                  onToggle={() => onToggle(task)}
                  onDelete={() => onDelete(task)}
                  onDefer={() => onDefer(task)}
                  onSetTime={(start, duration) => onSetTime(task, start, duration)}
                  onRename={
                    onRename ? (title) => onRename(task, title) : undefined
                  }
                />
                {clashing.has(task.id) && (
                  <p className="mt-0.5 pl-3 text-[length:var(--text-2xs)] text-[var(--color-warn)]">
                    Bir önceki görevle çakışıyor
                  </p>
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {untimed.length > 0 && (
        <>
          {/* Etiket yalnızca İKİ grup da doluyken anlamlıdır; tek grup
              varken "Saatsiz" başlığı gürültüdür. */}
          {timed.length > 0 && (
            <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
              Saatsiz
            </p>
          )}

          <ul className="flex flex-col gap-1.5">
            {untimed.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                today={today}
                onToggle={() => onToggle(task)}
                onDelete={() => onDelete(task)}
                onDefer={() => onDefer(task)}
                onSetTime={(start, duration) => onSetTime(task, start, duration)}
                onRename={onRename ? (title) => onRename(task, title) : undefined}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
