"use client";

import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import type { DateStr } from "@/lib/date/types";
import { GoalNodeForm } from "./GoalNodeForm";
import { GoalNodeRow } from "./GoalNodeRow";
import type { NodeProgress } from "./nodeprogress";
import {
  buildGoalTree,
  canMoveNode,
  flattenGoalTree,
  subtreeIds,
  treeKeyAction,
  type FlatGoalNode,
} from "./tree";
import type { GoalNode } from "./types";

interface GoalTreeViewProps {
  nodes: readonly GoalNode[];
  progress: ReadonlyMap<string, NodeProgress>;
  colorSlot: number;
  today: DateStr;
  pending: boolean;

  collapsed: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  focusedId: string | null;
  /** Altına yeni başlık formu açılacak düğüm; null → form kapalı. */
  addingUnder: string | null;

  onToggleCollapse: (id: string) => void;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onFocus: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onAddChild: (id: string) => void;
  onSubmitChild: (values: { title: string; note: string | null }) => void;
  onCancelChild: () => void;
  onRename: (id: string, values: { title: string; note: string | null }) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, parentId: string | null) => void;
  onSend: (id: string, date: DateStr) => void;
  onReorder: (id: string, delta: -1 | 1) => void;
  onDragStart?: (id: string) => void;
}

/**
 * Ağacın kabı — `role="tree"` ve klavye gezintisinin sahibi.
 *
 * ── Klavye kararları neden burada değil? ──
 * `treeKeyAction` (tree.ts) veriyor. Bu bileşen yalnızca olayı ona
 * soruyor ve dönen eylemi uyguluyor. Karar mantığı JSX'te yaşasaydı
 * test edilemezdi — bu depoda `.tsx` hiç test edilmiyor ve "ArrowLeft
 * açık dalda ne yapar" gibi bir kural sessizce yanlış olabilirdi.
 *
 * ── Odak neden DOM'a yazılıyor? ──
 * Gezinen `tabIndex` deseninde ok tuşu odağı mantıksal olarak
 * taşıyor ama tarayıcı odağı kendiliğinden gitmiyor; ekran okuyucu
 * yeni satırı ancak gerçek odak oraya taşınırsa duyurur.
 */
export function GoalTreeView({
  nodes,
  progress,
  colorSlot,
  today,
  pending,
  collapsed,
  selected,
  focusedId,
  addingUnder,
  onToggleCollapse,
  onExpand,
  onCollapse,
  onFocus,
  onToggleSelect,
  onAddChild,
  onSubmitChild,
  onCancelChild,
  onRename,
  onDelete,
  onMove,
  onSend,
  onReorder,
  onDragStart,
}: GoalTreeViewProps) {
  const listRef = useRef<HTMLUListElement>(null);

  const flat = useMemo(
    () => flattenGoalTree(buildGoalTree(nodes), collapsed),
    [nodes, collapsed],
  );

  // Mantıksal odağı gerçek DOM odağına taşı. `focusedId` null'ken
  // hiçbir şey yapılmaz: sayfa yüklendiğinde odağı çalmak, klavye
  // kullanıcısını bulunduğu yerden koparırdı.
  useEffect(() => {
    if (focusedId === null) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-node-id="${CSS.escape(focusedId)}"]`,
    );
    // Yalnızca ağacın içinde bir şey zaten odaktaysa taşı — kullanıcı
    // başka bir alana geçtiyse onu geri çekmek saldırgan olurdu.
    if (el && listRef.current?.contains(document.activeElement)) el.focus();
  }, [focusedId, flat]);

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (focusedId === null) return;

    // Form alanlarındaki oklar metin imlecini oynatmalı, ağacı değil.
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT"
    ) {
      return;
    }

    const action = treeKeyAction(event.key, flat, focusedId, collapsed);
    if (action === null) return;

    event.preventDefault();

    if (action.kind === "focus") onFocus(action.id);
    else if (action.kind === "expand") onExpand(action.id);
    else onCollapse(action.id);
  }

  return (
    <ul
      ref={listRef}
      role="tree"
      aria-label="Hedef ağacı"
      aria-multiselectable
      onKeyDown={handleKeyDown}
      className="flex flex-col"
    >
      {flat.map((item) => (
        <TreeRow
          key={item.node.id}
          item={item}
          nodes={nodes}
          progress={progress.get(item.node.id)}
          colorSlot={colorSlot}
          today={today}
          pending={pending}
          collapsed={collapsed.has(item.node.id)}
          focused={focusedId === item.node.id}
          selected={selected.has(item.node.id)}
          addingHere={addingUnder === item.node.id}
          onToggleCollapse={() => onToggleCollapse(item.node.id)}
          onFocus={() => onFocus(item.node.id)}
          onToggleSelect={() => onToggleSelect(item.node.id)}
          onAddChild={() => onAddChild(item.node.id)}
          onSubmitChild={onSubmitChild}
          onCancelChild={onCancelChild}
          onRename={(values) => onRename(item.node.id, values)}
          onDelete={() => onDelete(item.node.id)}
          onMove={(parentId) => onMove(item.node.id, parentId)}
          onSend={(date) => onSend(item.node.id, date)}
          onReorder={(delta) => onReorder(item.node.id, delta)}
          onDragStart={onDragStart && (() => onDragStart(item.node.id))}
        />
      ))}
    </ul>
  );
}

/**
 * Tek satır + altına açılabilen "yeni alt başlık" formu.
 *
 * Form ayrı bir `<li>` DEĞİL: `role="tree"` altındaki her çocuk
 * `treeitem` olmalı ve araya bir form satırı koymak ağacın yapısını
 * ekran okuyucuya bozuk gösterirdi. Bu yüzden form, ait olduğu
 * düğümün `<li>`'sinin içinde yaşıyor.
 */
function TreeRow({
  item,
  nodes,
  progress,
  colorSlot,
  today,
  pending,
  collapsed,
  focused,
  selected,
  addingHere,
  onToggleCollapse,
  onFocus,
  onToggleSelect,
  onAddChild,
  onSubmitChild,
  onCancelChild,
  onRename,
  onDelete,
  onMove,
  onSend,
  onReorder,
  onDragStart,
}: {
  item: FlatGoalNode;
  nodes: readonly GoalNode[];
  progress: NodeProgress | undefined;
  colorSlot: number;
  today: DateStr;
  pending: boolean;
  collapsed: boolean;
  focused: boolean;
  selected: boolean;
  addingHere: boolean;
  onToggleCollapse: () => void;
  onFocus: () => void;
  onToggleSelect: () => void;
  onAddChild: () => void;
  onSubmitChild: (values: { title: string; note: string | null }) => void;
  onCancelChild: () => void;
  onRename: (values: { title: string; note: string | null }) => void;
  onDelete: () => void;
  onMove: (parentId: string | null) => void;
  onSend: (date: DateStr) => void;
  onReorder: (delta: -1 | 1) => void;
  onDragStart?: () => void;
}) {
  // Taşıma hedefleri: `canMoveNode` geçerli bulduğu her yer, artı kök.
  // Geçersiz olanlar listeye HİÇ girmiyor — sunucu da reddederdi ama
  // reddedilen bir ağ turu, hiç sunulmayan bir seçenekten kötüdür.
  const moveTargets = useMemo(() => {
    const out: { id: string | null; label: string }[] = [];

    if (item.node.parentId !== null && canMoveNode(nodes, item.node.id, null) === null) {
      out.push({ id: null, label: "En üst seviye" });
    }

    for (const candidate of nodes) {
      if (candidate.id === item.node.id) continue;
      if (candidate.id === item.node.parentId) continue;
      if (canMoveNode(nodes, item.node.id, candidate.id) !== null) continue;
      out.push({ id: candidate.id, label: candidate.title });
    }

    return out;
  }, [nodes, item.node.id, item.node.parentId]);

  const subtreeCount = useMemo(
    () => subtreeIds(nodes, item.node.id).length,
    [nodes, item.node.id],
  );

  return (
    <GoalNodeRow
      flat={item}
      progress={progress}
      colorSlot={colorSlot}
      collapsed={collapsed}
      focused={focused}
      selected={selected}
      today={today}
      pending={pending}
      subtreeCount={subtreeCount}
      moveTargets={moveTargets}
      onToggleCollapse={onToggleCollapse}
      onFocus={onFocus}
      onToggleSelect={onToggleSelect}
      onRename={onRename}
      onAddChild={onAddChild}
      onDelete={onDelete}
      onMove={onMove}
      onSend={onSend}
      onReorder={onReorder}
      onDragStart={onDragStart}
    >
      {addingHere && (
        <div
          style={{ paddingLeft: "calc(1.25rem + 0.4rem)" }}
          className="py-1.5"
        >
          <GoalNodeForm
            pending={pending}
            onSubmit={onSubmitChild}
            onCancel={onCancelChild}
            placeholder={`"${item.node.title}" altına ne eklenecek?`}
          />
        </div>
      )}
    </GoalNodeRow>
  );
}
