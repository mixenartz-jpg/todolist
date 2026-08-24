"use client";

import { useMemo } from "react";
import { addDays } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import {
  useDeleteTask,
  useRenameTask,
  useRescheduleTask,
  useSetTaskColor,
  useSetTaskNote,
  useSetTaskTime,
  useToggleTask,
} from "@/features/tasks/mutations";
import { useSetTaskGoal } from "@/features/planlama/mutations";
import type { Task } from "@/features/tasks/types";

/**
 * Popover'ın yazma eylemleri.
 *
 * `usePlanTaskActions`'ın kardeşi ve aynı gerekçe: aynı eylem kümesi
 * iki ekranda (Bugün ızgarası, Planlama ızgarası) kullanılıyor ve
 * mutation'ları iki dosyada tekrar yazmak, birinde bir eylemin
 * unutulup ekranların sessizce ayrışmasına açık kapı bırakırdı.
 *
 * Hepsi DAR mutation'lar — `useUpdateTask` kasıtlı olarak yok.
 * Gerekçesi `useRenameTask`'ın doc-block'unda: geniş güncelleme,
 * önbellekten okunan bayat bir alanı sunucuya geri yazabilir.
 */
export interface TaskPopoverActions {
  onRename: (task: Task, title: string) => void;
  onSetNote: (task: Task, note: string | null) => void;
  onSetTime: (
    task: Task,
    startTime: string | null,
    durationMinutes: number | null,
  ) => void;
  onSetColor: (task: Task, colorSlot: number | null) => void;
  /**
   * Görevi aylık hedefe bağlar (`tasks.goal_id`).
   *
   * Haftalık hedef KARŞILIĞI YOK: `tasks.goal_id` yalnızca
   * `plan_goals`'a bakar — gerekçe `planlama/mutations.ts`'te.
   */
  onSetGoal: (task: Task, goalId: string | null) => void;
  onToggle: (task: Task) => void;
  /** Bir gün ileri atar. Tarihsiz görev bugünden itibaren sayılır. */
  onDefer: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function useTaskPopoverActions(
  today: DateStr,
  onError: (message: string) => void,
): TaskPopoverActions {
  const renameTask = useRenameTask(onError);
  const setTaskNote = useSetTaskNote(onError);
  const setTaskTime = useSetTaskTime(onError);
  const setTaskColor = useSetTaskColor(onError);
  const setTaskGoal = useSetTaskGoal(onError);
  const toggleTask = useToggleTask(onError);
  const rescheduleTask = useRescheduleTask(onError);
  const deleteTask = useDeleteTask(onError);

  /*
   * `useMemo`: bu nesne `TaskPopover`'a prop olarak iniyor ve her
   * render'da yeniden kurulsaydı gövdedeki `useEffect`'lerin bağımlılık
   * dizileri her seferinde değişirdi. Mutation nesneleri React Query
   * tarafından zaten kararlı tutuluyor.
   */
  return useMemo(
    () => ({
      onRename: (task: Task, title: string) =>
        renameTask.mutate({ id: task.id, title }),

      onSetNote: (task: Task, note: string | null) =>
        setTaskNote.mutate({ id: task.id, note }),

      onSetTime: (
        task: Task,
        startTime: string | null,
        durationMinutes: number | null,
      ) => setTaskTime.mutate({ id: task.id, startTime, durationMinutes }),

      onSetColor: (task: Task, colorSlot: number | null) =>
        setTaskColor.mutate({ id: task.id, colorSlot }),

      onSetGoal: (task: Task, goalId: string | null) =>
        setTaskGoal.mutate({ id: task.id, goalId }),

      onToggle: (task: Task) =>
        toggleTask.mutate({ id: task.id, done: !task.done }),

      /*
       * Tarihsiz görevde `dueDate` null: "yarın" ne demek belli değil.
       * Bugünden sayılır — kullanıcının "bunu yarın yap" demesi, görev
       * tarihsizken de anlamlı bir istektir.
       */
      onDefer: (task: Task) =>
        rescheduleTask.mutate({
          id: task.id,
          dueDate: addDays(task.dueDate ?? today, 1),
        }),

      onDelete: (task: Task) => deleteTask.mutate(task.id),
    }),
    [
      renameTask,
      setTaskNote,
      setTaskTime,
      setTaskColor,
      setTaskGoal,
      toggleTask,
      rescheduleTask,
      deleteTask,
      today,
    ],
  );
}
