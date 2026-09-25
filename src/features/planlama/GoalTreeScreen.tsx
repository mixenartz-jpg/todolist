"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { ScreenBody } from "@/components/Screen";
import { Toast, useToast } from "@/components/Toast";
import { startOfMonth, todayStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { useDeleteTask } from "@/features/tasks/mutations";
import { useTasks } from "@/features/tasks/queries";
import { GoalNodeForm } from "./GoalNodeForm";
import { GoalTreeHeader } from "./GoalTreeHeader";
import { GoalTreeView } from "./GoalTreeView";
import { NodeBulkSend } from "./NodeBulkSend";
import { planDistribution } from "./distribute";
import { goalTreeProgress, sentTasksByNode, treeRootRatio } from "./nodeprogress";
import {
  useCreateGoalNode,
  useDeleteGoalNode,
  useDistributeNodes,
  useMoveGoalNode,
  useEditGoalNode,
  useReorderGoalNodes,
  useSetNodeRepeating,
} from "./nodeMutations";
import { useGoalNodes } from "./nodeQueries";
import { usePlanGoals } from "./queries";
import { nextSiblingOrder, nodeEdit, reorderSiblings } from "./tree";

interface GoalTreeScreenProps {
  goalId: string;
}

/**
 * Hedef ağacı düzenleyicisi — özelliğin ana yüzeyi.
 *
 * Kullanıcı burada hedefi parçalara ayırıyor: konular, alt konular ve
 * yapılacak işler. Sonra o kalemleri günlere gönderiyor ve her biri
 * Bugün ekranında normal bir görev olarak beliriyor.
 *
 * ── Neden ayrı sayfa, hedef kartının içinde akordeon değil? ──
 * Üç seviyeli bir ağaç, bir kartın içinde sıkışır: girinti kartın
 * genişliğini yer, satır eylemleri (ekle/taşı/güne gönder) kartın
 * kendi eylemleriyle karışır. Ayrıca ağaç kurmak ayrı bir oturum işi
 * — kullanıcı hedef listesine bakarken değil, "şimdi kimyayı
 * planlayacağım" derken giriyor.
 *
 * ── Hedef nereden geliyor? ──
 * `usePlanGoals(month)` ay başına bölünmüş ve bu sayfa ayı bilmiyor.
 * Bu yüzden hedefin AYINI bilmeden onu bulamayız; çözüm, düğümlerden
 * okumak yerine bugünün ayından başlayıp hedefi aramak DEĞİL —
 * `useGoalNodes` zaten hedef kimliğiyle çalışıyor ve başlık için
 * hedefin kendisi gerekiyor. Şimdilik bugünün ayı okunuyor ve
 * bulunamazsa başlık sade çiziliyor; hedef listesi zaten bu sayfaya
 * yalnızca o aydan giriliyor.
 */
export function GoalTreeScreen({ goalId }: GoalTreeScreenProps) {
  const toast = useToast();
  const today = todayStr();

  const nodesQuery = useGoalNodes(goalId);
  const tasksQuery = useTasks();
  const goalsQuery = usePlanGoals(startOfMonth(today));

  const createNode = useCreateGoalNode(toast.show);
  const editNode = useEditGoalNode(toast.show);
  const deleteNode = useDeleteGoalNode(toast.show);
  const moveNode = useMoveGoalNode(toast.show);
  const reorderNodes = useReorderGoalNodes(toast.show);
  const distribute = useDistributeNodes(toast.show);
  // "Geri al": kalemden doğan görevi siler (iyimser — çip anında gider).
  const deleteTask = useDeleteTask(toast.show);
  const setRepeating = useSetNodeRepeating(toast.show);

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [addingUnder, setAddingUnder] = useState<string | null>(null);
  const [addingRoot, setAddingRoot] = useState(false);

  const nodes = useMemo(() => nodesQuery.data ?? [], [nodesQuery.data]);
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const goal = goalsQuery.data?.find((g) => g.id === goalId);

  const progress = useMemo(
    () => goalTreeProgress(nodes, tasks),
    [nodes, tasks],
  );

  /** Kalem → KENDİ görevleri: satırdaki "Gönderildi" çipleri. */
  const sentTasks = useMemo(() => sentTasksByNode(tasks), [tasks]);

  const ratio = useMemo(
    () => treeRootRatio(progress, nodes),
    [progress, nodes],
  );

  // Kök toplamları başlık için — `goalMeasure` ile aynı aritmetik ama
  // burada hedef satırına ihtiyaç yok.
  const totals = useMemo(() => {
    let taskTotal = 0;
    let taskDone = 0;
    for (const node of nodes) {
      if (node.parentId !== null) continue;
      const entry = progress.get(node.id);
      if (entry === undefined) continue;
      taskTotal += entry.taskTotal;
      taskDone += entry.taskDone;
    }
    return { taskTotal, taskDone };
  }, [nodes, progress]);

  const selectedNodes = useMemo(
    () => nodes.filter((n) => selected.has(n.id)),
    [nodes, selected],
  );

  const pending =
    createNode.isPending ||
    editNode.isPending ||
    deleteNode.isPending ||
    moveNode.isPending ||
    distribute.isPending;

  function toggle(set: ReadonlySet<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  /**
   * Seçilen kalemleri bir ya da BİRDEN ÇOK güne gönderir: her gün
   * için her kaleme bir görev. Tek `insert` — beş günlük bir gönderim
   * beş ağ turu değil.
   */
  function sendToDays(
    nodeIds: readonly string[],
    dates: readonly DateStr[],
    estimateMinutes: number | null = null,
  ) {
    const chosen = nodes.filter((n) => nodeIds.includes(n.id));
    const drafts = dates.flatMap(
      (date) =>
        planDistribution(chosen, { from: date, to: date, perDayCap: null }, goalId)
          .drafts,
    );
    if (drafts.length === 0) return;
    distribute.mutate({
      drafts: drafts.map((draft) => ({ ...draft, estimateMinutes })),
    });
  }

  return (
    <ScreenBody width="2xl">
      {goal ? (
        <GoalTreeHeader
          goal={goal}
          nodeCount={nodes.length}
          taskTotal={totals.taskTotal}
          taskDone={totals.taskDone}
          ratio={ratio}
        />
      ) : (
        <header className="mb-4">
          <Link
            href="/planlama/hedefler"
            className="text-[length:var(--text-xs)] text-[var(--color-ink-3)] hover:text-[var(--color-accent)]"
          >
            ← Hedefler
          </Link>
          <h1 className="mt-2 text-[length:var(--text-xl)] font-medium">
            Hedef ağacı
          </h1>
        </header>
      )}

      {nodesQuery.isPending ? (
        <div className="flex flex-col gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-[var(--color-surface-2)]"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      ) : (
        <GoalTreeView
          nodes={nodes}
          progress={progress}
          colorSlot={goal?.colorSlot ?? 0}
          today={today}
          pending={pending}
          collapsed={collapsed}
          selected={selected}
          focusedId={focusedId}
          addingUnder={addingUnder}
          onToggleCollapse={(id) => setCollapsed((set) => toggle(set, id))}
          onExpand={(id) =>
            setCollapsed((set) => {
              const next = new Set(set);
              next.delete(id);
              return next;
            })
          }
          onCollapse={(id) =>
            setCollapsed((set) => new Set(set).add(id))
          }
          onFocus={setFocusedId}
          onToggleSelect={(id) => setSelected((set) => toggle(set, id))}
          onAddChild={(id) => {
            setAddingRoot(false);
            setAddingUnder(id);
            // Kapalı bir dala çocuk eklenirse form görünmez kalırdı.
            setCollapsed((set) => {
              const next = new Set(set);
              next.delete(id);
              return next;
            });
          }}
          onSubmitChild={(values) => {
            if (addingUnder === null) return;
            createNode.mutate({
              planGoalId: goalId,
              parentId: addingUnder,
              title: values.title,
              note: values.note,
              sortOrder: nextSiblingOrder(nodes, addingUnder),
            });
          }}
          onCancelChild={() => setAddingUnder(null)}
          onRename={(id, values) => {
            const node = nodes.find((n) => n.id === id);
            if (node === undefined) return;

            // `nodeEdit` geçersiz başlıkta ve hiçbir şey değişmediğinde
            // null döner — boşa ağ turu atılmaz.
            const patch = nodeEdit(node, values);
            if (patch === null) return;

            editNode.mutate({ planGoalId: goalId, id, ...patch });
          }}
          onDelete={(id) => deleteNode.mutate({ planGoalId: goalId, id })}
          onMove={(id, parentId) =>
            moveNode.mutate({
              planGoalId: goalId,
              id,
              parentId,
              sortOrder: nextSiblingOrder(nodes, parentId),
            })
          }
          onSend={(id, dates, estimateMinutes) =>
            sendToDays([id], dates, estimateMinutes)
          }
          onToggleRepeating={(id) => {
            const node = nodes.find((n) => n.id === id);
            if (!node) return;
            setRepeating.mutate({
              planGoalId: goalId,
              id,
              repeating: !node.repeating,
            });
          }}
          sentTasks={sentTasks}
          onRecall={(taskId) =>
            deleteTask.mutate(taskId, {
              onSuccess: () => toast.show("Görev geri alındı.", "success"),
            })
          }
          onReorder={(id, delta) => {
            const patches = reorderSiblings(nodes, id, delta);
            if (patches.length === 0) return;
            reorderNodes.mutate({ planGoalId: goalId, patches });
          }}
        />
      )}

      <div className="mt-3">
        {addingRoot ? (
          <div className="rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-3">
            <GoalNodeForm
              pending={createNode.isPending}
              placeholder="Hangi konu?"
              onSubmit={(values) =>
                createNode.mutate({
                  planGoalId: goalId,
                  parentId: null,
                  title: values.title,
                  note: values.note,
                  sortOrder: nextSiblingOrder(nodes, null),
                })
              }
              onCancel={() => setAddingRoot(false)}
            />
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              setAddingUnder(null);
              setAddingRoot(true);
            }}
          >
            Başlık ekle
          </Button>
        )}
      </div>

      {selectedNodes.length > 0 && (
        <NodeBulkSend
          nodes={selectedNodes}
          today={today}
          goalId={goalId}
          pending={distribute.isPending}
          onClear={() => setSelected(new Set())}
          onDistribute={(drafts) => {
            distribute.mutate({ drafts });
            setSelected(new Set());
          }}
          onError={toast.show}
        />
      )}

      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </ScreenBody>
  );
}
