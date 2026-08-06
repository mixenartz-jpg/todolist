import type { DateStr } from "@/lib/date/types";

/**
 * Tek seferlik görev.
 *
 * Rutinlerden ayrıdır ve rutin istatistiklerine KARIŞMAZ: "Cuma
 * faturayı öde" tamamlanmadığında bir alışkanlık serisi kırılmamalı.
 * Bugün ekranında rutinlerle yan yana görünür ama ayrı bir bölümde.
 */
export interface Task {
  id: string;
  title: string;
  /** null → tarihsiz; bir gün yapılacak ama ne zaman belli değil. */
  dueDate: DateStr | null;
  done: boolean;
  note: string | null;
  sortOrder: number;
}

export interface TaskDraft {
  title: string;
  dueDate: DateStr | null;
  note: string | null;
}
