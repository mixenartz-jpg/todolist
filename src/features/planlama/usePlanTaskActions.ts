"use client";

import { useCallback } from "react";
import type { DateStr } from "@/lib/date/types";
import {
  useCreateTask,
  useDeleteTask,
  useRenameTask,
  useReorderTasks,
  useRescheduleTask,
  useSetTaskTime,
  useToggleTask,
} from "@/features/tasks/mutations";
import type { Task } from "@/features/tasks/types";
import { planReorder } from "./reorder";

/**
 * Izgara satırlarının ortak eylemleri.
 *
 * Ay ve Hafta ekranları AYNI eylem kümesini kullanır ve eskiden ikisi
 * de tek `PlanScreen` içindeydi. Ekranlar ayrı rotalara bölününce bu
 * yedi mutation'ı iki dosyada tekrar yazmak gerekirdi; hook, tekrarı
 * ortadan kaldırır ve "iki ekranda aynı davranış" garantisini yapısal
 * hale getirir — birinde `onRename` unutulursa öteki de kaybeder,
 * yani sessizce ayrışamazlar.
 */
export interface PlanTaskActions {
  addPending: boolean;
  onAdd: (title: string, date: DateStr) => void;
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
  /** Havuzdan bir güne yerleştirme ve "gecikmeyi bugüne al" için. */
  reschedule: (id: string, dueDate: DateStr | null) => void;
  /** Havuza tarihsiz görev ekler. */
  addBacklog: (title: string) => void;
}

export function usePlanTaskActions(
  onError: (message: string) => void,
): PlanTaskActions {
  const createTask = useCreateTask(onError);
  const toggleTask = useToggleTask(onError);
  const deleteTask = useDeleteTask(onError);
  const rescheduleTask = useRescheduleTask(onError);
  const renameTask = useRenameTask(onError);
  const setTaskTime = useSetTaskTime(onError);
  const reorderTasks = useReorderTasks(onError);

  const onReorder = useCallback(
    (dayTasks: readonly Task[], task: Task, delta: -1 | 1) => {
      const patches = planReorder(dayTasks, task.id, delta);
      if (patches.length > 0) reorderTasks.mutate(patches);
    },
    [reorderTasks],
  );

  return {
    addPending: createTask.isPending,
    onAdd: (title, date) =>
      createTask.mutate({ title, dueDate: date, note: null }),
    onToggle: (task) => toggleTask.mutate({ id: task.id, done: !task.done }),
    onDelete: (task) => deleteTask.mutate(task.id),
    onRename: (task, title) => renameTask.mutate({ id: task.id, title }),
    onSetTime: (task, startTime, durationMinutes) =>
      setTaskTime.mutate({ id: task.id, startTime, durationMinutes }),
    // Görevi havuza geri atar — tarihini kaldırır.
    onUnschedule: (task) =>
      rescheduleTask.mutate({ id: task.id, dueDate: null }),
    onReorder,
    reschedule: (id, dueDate) => rescheduleTask.mutate({ id, dueDate }),
    addBacklog: (title) =>
      createTask.mutate({ title, dueDate: null, note: null }),
  };
}
