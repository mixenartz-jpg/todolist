"use client";

import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { KonuRow } from "./KonuRow";
import { Chevron, CountPair, DueBadge, HeatBar } from "./tree-parts";
import type { DersNode } from "./tree";
import type { Mistake } from "./types";

interface DersRowProps {
  ders: DersNode;
  today: DateStr;
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
  onEdit: (mistake: Mistake) => void;
  onDelete: (mistake: Mistake) => void;
  onReviewed: (mistake: Mistake) => void;
  reviewPending: boolean;
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
}: DersRowProps) {
  const open = isOpen(ders.nodeKey);

  return (
    <li className="border-b border-[var(--color-line)] last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(ders.nodeKey)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2 rounded-md py-2.5 pl-2 pr-3 text-left",
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
            />
          ))}
        </ul>
      )}
    </li>
  );
}
