"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTasks } from "@/features/tasks/queries";
import { useOptionalViewer } from "@/lib/auth/ViewerProvider";
import { useSourceMarks } from "./markQueries";
import { indexProgress, sourceProgress, type SourceProgress } from "./progress";
import { useSetSourceStatus, useSourceResults, useSourceTrees, useTaskItems, useTopics } from "./queries";
import { autoAdvance, derivedSourceStatus } from "./unitStatus";

/**
 * Katalog, kaynak detayı, yan panel ve Dağıt'ın ortak verisi: ağaçlar
 * + görevler + test bağları + sonuçlar → kaynak başına ilerleme.
 *
 * Görev eklenip silinince TanStack anahtarları (`tasks`, `task-items`,
 * `task-results`) geçersiz kılınır; buradaki hesap yeniden çalışır ve
 * kutucuk renkleri anında güncellenir.
 */
export function useSourceProgress({ autoStatus = false }: { autoStatus?: boolean } = {}) {
  const viewer = useOptionalViewer();
  const studentId = viewer?.studentId ?? null;

  const treesQuery = useSourceTrees();
  const topicsQuery = useTopics();
  const tasksQuery = useTasks();
  const itemsQuery = useTaskItems();
  const resultsQuery = useSourceResults(studentId);
  const marksQuery = useSourceMarks();

  const trees = useMemo(() => treesQuery.data ?? [], [treesQuery.data]);
  const topics = useMemo(() => topicsQuery.data ?? [], [topicsQuery.data]);

  const index = useMemo(
    () =>
      indexProgress({
        tasks: tasksQuery.data ?? [],
        taskItems: itemsQuery.data ?? [],
        results: resultsQuery.data ?? [],
        itemMarks: marksQuery.data?.items ?? [],
        rangeMarks: marksQuery.data?.ranges ?? [],
      }),
    [tasksQuery.data, itemsQuery.data, resultsQuery.data, marksQuery.data],
  );
  const progress = useMemo(
    () => new Map<string, SourceProgress>(trees.map((t) => [t.id, sourceProgress(t, index)])),
    [trees, index],
  );

  // Kaynak durumu otomatik İLERİ gider (sırada → devam → bitti).
  const { mutate: setStatus } = useSetSourceStatus();
  const sent = useRef(new Set<string>());
  const settled =
    !tasksQuery.isPending &&
    !itemsQuery.isPending &&
    !marksQuery.isPending &&
    (studentId === null || !resultsQuery.isPending);
  useEffect(() => {
    if (!autoStatus || !settled) return;
    for (const p of progress.values()) {
      const next = autoAdvance(p.source.status, derivedSourceStatus(p.summary, p.hasLinks));
      const key = `${p.source.id}:${next}`;
      if (next && !sent.current.has(key)) {
        sent.current.add(key);
        setStatus({ id: p.source.id, status: next });
      }
    }
  }, [autoStatus, settled, progress, setStatus]);

  return {
    marks: marksQuery.data ?? { items: [], ranges: [] },
    trees,
    topics,
    progress,
    index,
    results: resultsQuery.data ?? [],
    studentId,
    loading:
      treesQuery.isPending ||
      topicsQuery.isPending ||
      tasksQuery.isPending ||
      itemsQuery.isPending ||
      marksQuery.isPending,
    error: treesQuery.error ?? topicsQuery.error ?? null,
  };
}
