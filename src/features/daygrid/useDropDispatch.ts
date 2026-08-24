"use client";

import { useCallback } from "react";
import { useMoveTask, useSetTaskTime } from "@/features/tasks/mutations";
import type { DropIntent } from "./drop";

/**
 * Sürükleme niyetini mutasyona dağıtır.
 *
 * ── Neden ayrı bir hook? ──
 * Aynı dağıtım iki ekranda gerekiyor (Bugün ızgarası, Planlama
 * ızgarası). İki kopya, `useMoveTask`'ın ATOMİKLİK sözleşmesinin
 * birinde unutulmasına açık kapı bırakırdı — ve o hatanın belirtisi
 * gözle görülmez: görev doğru yere gider, sadece önbellek bir an için
 * yarı-eski satırla ezilir.
 *
 * ── Neden iki farklı mutasyon? ──
 * Gün İÇİ taşıma ve boyutlandırma dar `useSetTaskTime`'a gider; gün
 * DEĞİŞTİREN taşıma ise tek atomik `useMoveTask`'a. İkisini
 * zincirlemek (önce tarih, sonra saat) önbelleği arada yarı-eski bir
 * satırla ezerdi — gerekçenin tamamı `useMoveTask`'ın doc-block'unda.
 */
export function useDropDispatch(
  onError: (message: string) => void,
): (intent: DropIntent) => void {
  const setTaskTime = useSetTaskTime(onError);
  const moveTask = useMoveTask(onError);

  return useCallback(
    (intent: DropIntent) => {
      switch (intent.kind) {
        case "time":
          setTaskTime.mutate({
            id: intent.id,
            startTime: intent.startTime,
            durationMinutes: intent.durationMinutes,
          });
          return;
        case "unschedule":
          setTaskTime.mutate({
            id: intent.id,
            startTime: null,
            durationMinutes: null,
          });
          return;
        case "move":
        case "schedule":
          moveTask.mutate({
            id: intent.id,
            dueDate: intent.dueDate,
            startTime: intent.startTime,
            durationMinutes: intent.durationMinutes,
          });
          return;
        case "none":
          return;
      }
    },
    [setTaskTime, moveTask],
  );
}
