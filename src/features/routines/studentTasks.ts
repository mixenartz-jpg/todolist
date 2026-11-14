import { addDays, compareDates } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";
import { isDueOn } from "./schedule";
import type { RoutineWithSchedule } from "./types";

/*
 * Öğrenci rutinleri → eksik rutin görevleri. Saf; sunucu (0037
 * `insert_routine_tasks`) her çifti yeniden doğrular ve aynı gün + aynı
 * rutin için ikinci görevi reddeder. İstemci yalnızca EKSİK olanları
 * gönderir: görev zaten varsa çağrı hiç yapılmaz.
 *
 * Esnek (flexible) programlı rutinler otomatik görev üretmez — hiçbir
 * gün zorunlu değildir (`isDueOn` false). Koç onları elle güne ekler.
 */

export interface RoutineTaskRequest {
  routineId: string;
  dueDate: DateStr;
}

/** Görünen pencere: 3 gün geri (kaçan günler), 14 gün ileri. */
export const ROUTINE_WINDOW = { back: 3, ahead: 14 } as const;

export function routineTasksToCreate(
  routines: readonly RoutineWithSchedule[],
  tasks: ReadonlyArray<Pick<Task, "routineId" | "dueDate">>,
  from: DateStr,
  to: DateStr,
): RoutineTaskRequest[] {
  const existing = new Set(
    tasks.flatMap((t) => (t.routineId && t.dueDate ? [`${t.routineId}|${t.dueDate}`] : [])),
  );
  const out: RoutineTaskRequest[] = [];
  for (const r of routines) {
    if (r.studentId === null) continue;
    for (let d = from; compareDates(d, to) <= 0; d = addDays(d, 1)) {
      if (!isDueOn(r, d)) continue;
      if (existing.has(`${r.id}|${d}`)) continue;
      out.push({ routineId: r.id, dueDate: d });
    }
  }
  return out;
}
