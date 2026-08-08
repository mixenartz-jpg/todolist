"use client";

import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { MistakeRow } from "./MistakeRow";
import { Chevron, CountPair, DueBadge, HeatBar } from "./tree-parts";
import type { KonuNode } from "./tree";
import type { Mistake } from "./types";

interface KonuRowProps {
  konu: KonuNode;
  today: DateStr;
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
  onEdit: (mistake: Mistake) => void;
  onDelete: (mistake: Mistake) => void;
  onReviewed: (mistake: Mistake) => void;
  reviewPending: boolean;
}

/** Ağacın ikinci seviyesi: bir dersin altındaki tek konu. */
export function KonuRow({
  konu,
  today,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
  onReviewed,
  reviewPending,
}: KonuRowProps) {
  const open = isOpen(konu.nodeKey);

  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(konu.nodeKey)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2 rounded-md py-1.5 pl-7 pr-3 text-left",
          "transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-2)]",
        )}
      >
        <Chevron open={open} />
        <HeatBar heat={konu.heat} />
        <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {konu.konu}
        </span>
        <DueBadge count={konu.dueCount} />
        <CountPair week={konu.week} total={konu.total} />
      </button>

      {open && (
        <ul className="flex flex-col">
          {konu.mistakes.map((mistake) => (
            <MistakeRow
              key={mistake.id}
              mistake={mistake}
              today={today}
              open={isOpen(`m:${mistake.id}`)}
              onToggle={() => onToggle(`m:${mistake.id}`)}
              onEdit={() => onEdit(mistake)}
              onDelete={() => onDelete(mistake)}
              onReviewed={() => onReviewed(mistake)}
              reviewPending={reviewPending}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
