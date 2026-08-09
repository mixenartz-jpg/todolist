"use client";

import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { KonuRow } from "./KonuRow";
import { RenameButton, RenameRow } from "./RenameRow";
import { Chevron, CountPair, DueBadge, HeatBar } from "./tree-parts";
import type { DersNode, KonuNode } from "./tree";
import type { Mistake } from "./types";
import "@/components/list-motion.css";

interface DersRowProps {
  ders: DersNode;
  today: DateStr;
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
  onEdit: (mistake: Mistake) => void;
  onDelete: (mistake: Mistake) => void;
  onReviewed: (mistake: Mistake) => void;
  reviewPending: boolean;
  /** Şu an yeniden adlandırılan düğümün `nodeKey`'i (yoksa null). */
  renamingKey: string | null;
  onStartRename: (ders: DersNode) => void;
  onStartRenameKonu: (ders: DersNode, konu: KonuNode) => void;
  onCancelRename: () => void;
  onRename: (ders: DersNode, next: string) => void;
  onRenameKonu: (ders: DersNode, konu: KonuNode, next: string) => void;
}

/** Ağacın birinci seviyesi: tek bir ders. */
export function DersRow({
  ders,
  today,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
  onReviewed,
  reviewPending,
  renamingKey,
  onStartRename,
  onStartRenameKonu,
  onCancelRename,
  onRename,
  onRenameKonu,
}: DersRowProps) {
  const open = isOpen(ders.nodeKey);
  const renaming = renamingKey === ders.nodeKey;

  return (
    <li className="border-b border-[var(--color-line)] last:border-b-0">
      {renaming ? (
        <RenameRow
          value={ders.ders}
          level="ders"
          onSubmit={(next) => onRename(ders, next)}
          onCancel={onCancelRename}
        />
      ) : (
        /*
         * Genişletici ile yeniden adlandırma düğmesi KARDEŞTİR.
         * Eskiden tüm satır tek bir <button>'dı; yeniden adlandırma
         * onun içine konsaydı iç içe etkileşimli öğe oluşur, bu hem
         * geçersiz HTML hem de klavyeyle ulaşılamaz bir düğme demek
         * olurdu.
         */
        <div className="revealOnHover flex items-center pr-2">
          <button
            type="button"
            onClick={() => onToggle(ders.nodeKey)}
            aria-expanded={open}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-md py-2.5 pl-2 pr-1 text-left",
              "transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-2)]",
            )}
          >
            <Chevron open={open} />
            <HeatBar heat={ders.heat} />
            <span className="min-w-0 flex-1 truncate text-[length:var(--text-base)] font-medium">
              {ders.ders}
            </span>
            <DueBadge count={ders.dueCount} />
            <CountPair week={ders.week} total={ders.total} />
          </button>

          <RenameButton label={ders.ders} onClick={() => onStartRename(ders)} />
        </div>
      )}

      {open && (
        <ul className="flex flex-col pb-1.5">
          {ders.konular.map((konu) => (
            <KonuRow
              key={konu.nodeKey}
              konu={konu}
              today={today}
              isOpen={isOpen}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onReviewed={onReviewed}
              reviewPending={reviewPending}
              renaming={renamingKey === konu.nodeKey}
              onStartRename={() => onStartRenameKonu(ders, konu)}
              onCancelRename={onCancelRename}
              onRename={(next) => onRenameKonu(ders, konu, next)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
