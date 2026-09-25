"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { formatShortDate } from "@/lib/ui/tr";
import type { DateStr } from "@/lib/date/types";
import { useCarryTasks } from "@/features/tasks/mutations";
import type { Task } from "@/features/tasks/types";
import type { DayClose } from "./daysummary";
import { dayLine } from "@/features/coach/messages";
import {
  carriedCount,
  carriedDays,
  suggestedTomorrowLoad,
  tomorrow,
  type EveningAction,
} from "./evening";
import "@/components/sheet.css";

/**
 * Akşam rutini — günü kapatma paneli.
 *
 * ── Ne yapıyor? ──
 * Gün sonunda bitmemiş işleri tek tek ele alıyor: yarına mı, havuza
 * mı, yoksa olduğu yerde mi kalsın. Amaç, işleri sessizce yarına
 * devretmek yerine kullanıcının BİLEREK karar vermesi — çünkü sessiz
 * devir, bir işin haftalarca taşınmasının en yaygın yolu.
 *
 * ── Varsayılan neden "yarına" DEĞİL? ──
 * Hiçbir seçenek önceden işaretli gelmiyor. Bir varsayılan koymak,
 * paneli "onayla ve geç" ekranına çevirirdi ve tam da engellemeye
 * çalıştığı düşüncesiz devri otomatikleştirirdi.
 */
export function EveningSheet({
  tasks,
  close,
  today,
  onClose,
  onError,
}: {
  /** Günün bitmemiş işleri. */
  tasks: readonly Task[];
  close: DayClose;
  today: DateStr;
  onClose: () => void;
  onError?: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const carryTasks = useCarryTasks(onError);

  /** Görev kimliği → verilen karar. Karar verilmemişse anahtarı yok. */
  const [decisions, setDecisions] = useState<Map<string, EveningAction>>(
    new Map(),
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const carried = carriedCount(tasks, today);
  const suggested = suggestedTomorrowLoad(carried);
  const summary = dayLine(close);

  function decide(id: string, action: EveningAction) {
    setDecisions((current) => {
      const next = new Map(current);
      /* Aynı düğmeye ikinci kez basmak kararı GERİ ALIR: yanlış
         tuşa basan kullanıcının paneli kapatıp açması gerekmesin. */
      if (next.get(id) === action) next.delete(id);
      else next.set(id, action);
      return next;
    });
  }

  function apply() {
    const moves: { id: string; dueDate: DateStr | null }[] = [];

    for (const [id, action] of decisions) {
      if (action === "tomorrow") moves.push({ id, dueDate: tomorrow(today) });
      else if (action === "backlog") moves.push({ id, dueDate: null });
      // "keep" hiçbir şey yazmaz — görev olduğu yerde kalır.
    }

    if (moves.length > 0) carryTasks.mutate(moves);
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="daySheet"
    >
      <div className="daySheetPanel">
        <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5">
          <h2 className="text-[length:var(--text-lg)] font-semibold tracking-[-0.01em]">
            Günü kapat
          </h2>

          {/*
            Koçluk: gün özeti + yarına dair TEK öneri. Öneri veriye
            dayanıyor — "yapabilirsin!" değil, "bugün 3 iş taşıdın".
          */}
          <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {summary.headline}
            {summary.detail ? ` · ${summary.detail}` : ""}
          </p>

          {carried > 0 && (
            <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
              Bugün {carried} iş geçmişten taşındı; yarına {suggested}&apos;ten
              fazla koymamak gerçekçi olur.
            </p>
          )}
        </header>

        <div className="flex flex-col gap-3 px-4 py-4">
          {tasks.length === 0 ? (
            <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              Bitmemiş iş kalmadı. Günü olduğu gibi kapatabilirsin.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tasks.map((task) => {
                const days = carriedDays(task, today);
                const decision = decisions.get(task.id);

                return (
                  <li
                    key={task.id}
                    className={cn(
                      "rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5",
                      "transition-[border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
                      "hover:border-[var(--color-line-2)] hover:shadow-[var(--glow-card-hover)]",
                    )}
                  >
                    <p className="break-words text-[length:var(--text-sm)]">
                      {task.title}
                    </p>

                    {/*
                      "4 gündür taşınıyor" bir yargı değil ölçü — ama
                      kararı kolaylaştıran ölçü. Dört kez ertelenen bir
                      iş muhtemelen yarın da yapılmayacak ve havuz onun
                      dürüst yeri.
                    */}
                    {days !== null && task.dueDate && (
                      <p className="mt-0.5 text-[length:var(--text-xs)] text-[var(--color-warn)]">
                        {days} gündür taşınıyor ({formatShortDate(task.dueDate)})
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <ActionButton
                        active={decision === "tomorrow"}
                        onClick={() => decide(task.id, "tomorrow")}
                      >
                        Yarına
                      </ActionButton>
                      <ActionButton
                        active={decision === "backlog"}
                        onClick={() => decide(task.id, "backlog")}
                      >
                        Havuza
                      </ActionButton>
                      <ActionButton
                        active={decision === "keep"}
                        onClick={() => decide(task.id, "keep")}
                      >
                        Kalsın
                      </ActionButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={apply}
              className={cn(
                "inline-flex h-10 items-center rounded-lg px-4",
                "text-[length:var(--text-sm)] font-medium",
                "bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]",
                "transition-shadow duration-[var(--duration-fast)]",
                "hover:shadow-[var(--glow-accent-md)]",
              )}
            >
              Günü kapat
            </button>

            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex h-10 items-center rounded-lg px-3 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-ink)]"
            >
              Vazgeç
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function ActionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-md px-2.5 text-[length:var(--text-xs)]",
        "transition-colors duration-[var(--duration-fast)]",
        active
          ? "bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
      )}
    >
      {children}
    </button>
  );
}
