import type { DateStr } from "@/lib/date/types";
import type { TaskResultStatus } from "@/lib/db/database.types";

export type { TaskResultStatus };

/** Bir görevin bir gündeki sonucu (öğrenci girer, koç okur). */
export interface TaskResult {
  taskId: string;
  date: DateStr;
  studentId: string;
  /** null → durum seçilmedi. */
  status: TaskResultStatus | null;
  total: number | null;
  correct: number | null;
  wrong: number | null;
  empty: number | null;
  actualMinutes: number | null;
  missingTopics: string[];
  reason: string | null;
  note: string | null;
  /**
   * Gerçekten yapıldığı gün (0033). `date` PLANLANAN gündür; ikisi
   * farklıysa görev erken (ya da geç) yapılmıştır. Veritabanı
   * damgalar — istemci yazmaz.
   */
  doneOn: DateStr | null;
  /** İlerlet: en son gelinen sayfa/soru/ders numarası (0034). */
  reachedTo?: number | null;
  /** İzle: 1 anlamadım · 2 kısmen · 3 anladım. */
  understanding?: number | null;
  /** İzle + Feynman: öğrencinin kendi cümleleriyle kısa özet. */
  feynmanNote?: string | null;
  /** Yarım kalan çok testli görevde öğrencinin yaptığı testler (item id). */
  doneItems?: string[] | null;
  updatedAt: string;
}

/** Kaydedilecek alanlar — anahtar ve sunucu damgaları dışındaki her şey. */
export type TaskResultInput = Omit<TaskResult, "studentId" | "updatedAt" | "doneOn">;

export interface DailyLog {
  studentId: string;
  date: DateStr;
  /** "HH:MM" */
  sleepAt: string | null;
  wakeAt: string | null;
  studyBucket: number | null;
  screenBucket: number | null;
  energy: number | null;
  note: string | null;
  updatedAt: string;
}

export type DailyLogInput = Omit<DailyLog, "studentId" | "updatedAt">;

export interface CoachNote {
  coachId: string;
  studentId: string;
  date: DateStr;
  scale: "day" | "week";
  note: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<TaskResultStatus, string> = {
  done: "Tamamlandı",
  partial: "Yarım kaldı",
  skipped: "Yapılmadı",
};
