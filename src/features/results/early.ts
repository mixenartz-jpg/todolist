import { toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { MONTHS } from "@/lib/ui/tr";
import type { TaskResult } from "./types";

/**
 * Görev planlanan gününden ÖNCE mi yapıldı? Yapıldığı günü döner,
 * değilse null.
 *
 * Yalnızca done/partial sayılır: "yapılmadı" işaretinin bir yapılma
 * günü yoktur. `date` planlanan gün (task_results PK'si), `doneOn`
 * gerçek gün (0033). Günlük yüzde planlanan güne göre kalır; bu
 * yalnızca koça bir rozet gösterir.
 */
export function earlyDoneOn(
  result: Pick<TaskResult, "date" | "doneOn" | "status"> | undefined | null,
): DateStr | null {
  if (!result || !result.doneOn) return null;
  if (result.status !== "done" && result.status !== "partial") return null;
  return result.doneOn < result.date ? result.doneOn : null;
}

/** "erken yapıldı (14 Kas)" */
export function earlyLabel(doneOn: DateStr): string {
  const { month, day } = toParts(doneOn);
  return `erken yapıldı (${day} ${MONTHS[month].slice(0, 3)})`;
}
