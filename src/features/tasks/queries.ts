"use client";

import { useQuery } from "@tanstack/react-query";
import { asDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import type { TaskRow } from "@/lib/db/database.types";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "./types";

/**
 * Tüm görevler.
 *
 * Görev sayısı bir kişi için yüzlerle ölçülür; hepsini tek seferde
 * çekip bellekte filtrelemek, tarih aralığı başına ayrı sorgudan hem
 * basit hem hızlıdır. Bugün ekranı bunu `tasksForDay` ile süzer.
 */
export function useTasks() {
  return useQuery({
    queryKey: qk.tasks(),
    queryFn: fetchTasks,
  });
}

async function fetchTasks(): Promise<Task[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("done", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as TaskRow[]).map(toTask);
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date ? asDateStr(row.due_date) : null,
    done: row.done,
    note: row.note,
    sortOrder: row.sort_order,
    // Saniyeyi SINIRDA kırp: tüm uygulama 'HH:MM' ile çalışsın,
    // biçim dönüşümü her kullanım yerinde tekrarlanmasın.
    startTime: row.start_time ? row.start_time.slice(0, 5) : null,
    durationMinutes: row.duration_minutes,
  };
}

/**
 * Belirli bir günde gösterilecek görevler.
 *
 * O güne tarihlenenler + GEÇMİŞTE kalmış tamamlanmamışlar. İkincisi
 * önemli: dünkü yapılmamış bir görev sessizce kaybolursa uygulama
 * güvenilmez olur. Geçmişten taşananlar arayüzde ayrıca işaretlenir.
 */
export function tasksForDay(tasks: readonly Task[], date: DateStr): Task[] {
  return tasks.filter((t) => {
    if (t.dueDate === null) return false;
    if (t.dueDate === date) return true;
    return !t.done && t.dueDate < date;
  });
}

/** Tarihi olmayan görevler ("bir ara yapılacak"). */
export function undatedTasks(tasks: readonly Task[]): Task[] {
  return tasks.filter((t) => t.dueDate === null);
}

/** Bu görev geçmişten mi taşındı? */
export function isOverdue(task: Task, today: DateStr): boolean {
  return task.dueDate !== null && !task.done && task.dueDate < today;
}
