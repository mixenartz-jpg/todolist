"use client";

import type { DateStr } from "@/lib/date/types";
import { splitDaySchedule } from "@/features/tasks/schedule";
import { TaskItem } from "@/features/tasks/TaskItem";
import type { Task } from "@/features/tasks/types";
import { CategoryDot } from "./CategoryDot";
import { ReorderButtons } from "./ReorderButtons";
import type { Category } from "./types";

interface PlanTaskListProps {
  /** Sıralanmamış hâliyle verilir; sıra burada kurulur. */
  tasks: readonly Task[];
  today: DateStr;
  /** Kimlikten kategoriye — satırdaki renk noktası için. */
  categoryById: ReadonlyMap<string, Category>;
  className?: string;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRename: (task: Task, title: string) => void;
  onSetTime: (
    task: Task,
    startTime: string | null,
    durationMinutes: number | null,
  ) => void;
  onUnschedule: (task: Task) => void;
  onReorder: (dayTasks: readonly Task[], task: Task, delta: -1 | 1) => void;
}

/**
 * Bir günün görev listesi — hafta sütununun ve ay kutusunun ortak içi.
 *
 * ── Neden ortak bir KUTU bileşeni değil de yalnızca liste? ──
 * Hafta sütunu içeriği kadar uzar, ay kutusu sabit boydadır ve içinde
 * kaydırılır; başlıkları da farklıdır (biri gün adını, diğeri plan
 * noktasını taşır). Kutuyu ortaklaştırmak `fixedHeight?`, `hasPlan?`,
 * `inScope?` gibi dört-beş boolean kaçış deliği demekti. Gerçekten
 * birebir aynı olan tek parça bu liste.
 *
 * ── Sıralama neden burada? ──
 * Gün içi sıra Bugün ekranıyla AYNI kuralı izler: önce saatliler saate
 * göre, sonra saatsizler. Çağıranlara bırakılsaydı, aynı günün iki
 * ekranda farklı sırada görünmesi bir gözden kaçmaya bakardı. Burada
 * yapılması bunu yapısal olarak imkânsız kılar.
 *
 * Boş günde HİÇ render edilmez (`null` döner): boş bir `<ul>` ekran
 * okuyucuya "liste, 0 öğe" diye duyurulurdu ve ayda 42 kez.
 */
export function PlanTaskList({
  tasks,
  today,
  categoryById,
  className,
  onToggle,
  onDelete,
  onRename,
  onSetTime,
  onUnschedule,
  onReorder,
}: PlanTaskListProps) {
  const { timed, untimed } = splitDaySchedule(tasks);
  const ordered = [...timed, ...untimed];

  if (ordered.length === 0) return null;

  return (
    <ul className={className}>
      {ordered.map((task, index) => {
        const category =
          task.categoryId === null ? undefined : categoryById.get(task.categoryId);

        return (
          <TaskItem
            key={task.id}
            task={task}
            today={today}
            /*
             * Dar sütunda kategori SEÇİCİSİ yok, yalnızca nokta:
             * 150px'e bir `<select>` sığmaz ve başlığı yer. Kategori
             * atamak gün panelinden yapılır — orada yer var ve zaten
             * "bu günü düzenliyorum" bağlamı kurulmuş.
             */
            marker={category && <CategoryDot category={category} size={7} />}
            // Sütun ~150px: simgeler başlığın altına iner.
            compact
            onToggle={() => onToggle(task)}
            onDelete={() => onDelete(task)}
            onRename={(title) => onRename(task, title)}
            onSetTime={(start, duration) => onSetTime(task, start, duration)}
            // "Ertele" simgesi burada havuza geri atar: planlarken asıl
            // ihtiyaç "bunu şimdilik geri koy"dur, bir gün ilerletmek
            // değil — o zaten sıradaki güne tıklamaktır.
            onDefer={() => onUnschedule(task)}
            extra={
              ordered.length > 1 && !task.done ? (
                <ReorderButtons
                  title={task.title}
                  isFirst={index === 0}
                  isLast={index === ordered.length - 1}
                  onMove={(delta) => onReorder(ordered, task, delta)}
                />
              ) : undefined
            }
          />
        );
      })}
    </ul>
  );
}
