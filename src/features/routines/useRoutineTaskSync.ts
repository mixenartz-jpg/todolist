"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTasks } from "@/features/tasks/queries";
import { addDays, todayStr } from "@/lib/date/date";
import { qk } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";
import { useStudentRoutines } from "./queries";
import { ROUTINE_WINDOW, routineTasksToCreate } from "./studentTasks";

/**
 * Öğrenci rutinlerinin görevlerini görünen pencere için üret (eksik
 * olanları). Koçun Planlama/Panel'i ve öğrencinin Bugün ekranı çağırır;
 * hangisi önce açılırsa o üretir. Sunucu idempotent: aynı gün + aynı
 * rutin için tek görev.
 */
export function useRoutineTaskSync() {
  const qc = useQueryClient();
  const routines = useStudentRoutines();
  const tasks = useTasks();
  const sent = useRef(new Set<string>());

  const today = todayStr();
  const ready = routines.isSuccess && tasks.isSuccess;
  const requests = ready
    ? routineTasksToCreate(
        routines.data,
        tasks.data,
        addDays(today, -ROUTINE_WINDOW.back),
        addDays(today, ROUTINE_WINDOW.ahead),
      )
    : [];
  const key = requests.map((r) => `${r.routineId}|${r.dueDate}`).join(",");

  useEffect(() => {
    if (!key) return;
    // Aynı çift bir oturumda bir kez gönderilir (silinen görev ekranda
    // hemen geri doğmasın; sunucu zaten idempotent).
    const batch = key.split(",").filter((k) => !sent.current.has(k));
    if (batch.length === 0) return;
    batch.forEach((k) => sent.current.add(k));
    const rows = batch.map((k) => {
      const [routine_id, due_date] = k.split("|");
      return { routine_id, due_date };
    });
    void createClient()
      .rpc("insert_routine_tasks", { p_rows: rows })
      .then(({ data, error }) => {
        // 0037 çalıştırılmadıysa sessizce vazgeç (fonksiyon yok).
        if (!error && Number(data) > 0) qc.invalidateQueries({ queryKey: qk.tasks() });
      });
  }, [key, qc]);
}

/** Esnek öğrenci rutinini koç elle bir güne ekler. */
export async function addRoutineTask(routineId: string, dueDate: string): Promise<number> {
  const { data, error } = await createClient().rpc("insert_routine_tasks", {
    p_rows: [{ routine_id: routineId, due_date: dueDate }],
  });
  if (error) throw error;
  return Number(data);
}
