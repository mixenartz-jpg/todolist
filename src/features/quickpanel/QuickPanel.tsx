"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { todayStr } from "@/lib/date/date";
import { useTasks } from "@/features/tasks/queries";
import { useToggleTask } from "@/features/tasks/mutations";
import { isPendingTask } from "@/features/tasks/pending";
import { useZen } from "@/features/zen/ZenProvider";
import { nextTask } from "@/features/today/focus";
import { openTaskCount, quickPanelTasks, shouldShowPanel } from "./panel";
import "./quickpanel.css";

/**
 * Hızlı panel — her sayfanın köşesinde duran bugün kontrolü.
 *
 * ── Neden her sayfada? ──
 * Kullanıcı Planlama'da ay kurarken ya da İstatistik'e bakarken
 * bugünün bir işini işaretlemek isteyebilir. Bugün sekmesine gidip
 * geri dönmek, yaptığı işin bağlamını kaybettiriyor — ay ızgarasında
 * hangi haftaya baktığını, hangi hedefi düzenlediğini.
 *
 * ── Modal DEĞİL ──
 * `<dialog>` kullanılmıyor, odak tuzağı yok, zemin karartılmıyor.
 * Gerekçe: panel açıkken sayfanın kullanılabilir kalması GEREKİYOR.
 * Bütün amacı "işini bırakmadan şunu işaretle"; sayfayı kilitlemek
 * tam da engellemeye çalıştığı bağlam kaybını üretirdi.
 *
 * Bunun karşılığı: Esc kapatır ama dışarı tıklamak KAPATMAZ. Dışarı
 * tıklamak sayfayla çalışmak demek ve panel o sırada kapanırsa
 * kullanıcı her tıklamada onu yeniden açmak zorunda kalırdı.
 */
export function QuickPanel() {
  const today = todayStr();
  const [wantsOpen, setWantsOpen] = useState(false);
  const panelId = useId();

  const tasksQuery = useTasks();
  const toggleTask = useToggleTask();
  const zen = useZen();

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const list = useMemo(() => quickPanelTasks(tasks, today), [tasks, today]);
  const openCount = useMemo(() => openTaskCount(tasks, today), [tasks, today]);
  const visible = useMemo(() => shouldShowPanel(tasks, today), [tasks, today]);

  /* Zen'e girilecek iş — odak kartıyla AYNI seçim kuralı. */
  const next = useMemo(() => nextTask(list, today), [list, today]);

  /*
   * Açıklık TÜRETİLMİŞ, ham durum değil.
   *
   * Gün boyunca açık kalan bir sekmede bütün işler bitince widget
   * kaybolur; açık panel de onunla birlikte gitmeli. Bunu bir
   * `useEffect` ile `setOpen(false)` yaparak çözmek fazladan bir
   * render turu ve bir "efektte durum yazma" uyarısı demekti —
   * oysa soru zaten türetilebilir bir soru: panel ancak GÖRÜNÜR bir
   * widget'ın içinde açık olabilir.
   */
  const open = wantsOpen && visible;

  /* Esc kapatır — modal olmayan bir panelin tek klavye sözleşmesi. */
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setWantsOpen(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!visible) return null;

  const done = list.length - openCount;

  return (
    <div className="quickPanel">
      {open && (
        <div
          id={panelId}
          className={cn(
            "quickPanelSheet rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2",
            "shadow-[0_8px_32px_-8px_rgb(0_0_0/0.4)]",
          )}
        >
          {/* Zen köprüsü: panel "ne kaldı"yı gösteriyor, Zen o
              işlerden birine gömülmeyi sağlıyor. Sıradaki iş
              listenin ilki — odak kartıyla AYNI kural (focus.ts). */}
          {next && zen && (
            <button
              type="button"
              onClick={() => zen.enter(next)}
              className={cn(
                "mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2",
                "text-[length:var(--text-sm)] text-[var(--color-accent)]",
                "transition-colors duration-[var(--duration-fast)]",
                "hover:bg-[var(--color-surface-2)]",
              )}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              <span className="min-w-0 truncate">Odaklan: {next.title}</span>
            </button>
          )}

          <ul className="flex flex-col">
            {list.map((task) => {
              const pending = isPendingTask(task.id);

              return (
                <li key={task.id}>
                  <button
                    type="button"
                    disabled={pending}
                    aria-pressed={task.done}
                    onClick={() =>
                      toggleTask.mutate({ id: task.id, done: !task.done })
                    }
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left",
                      "transition-colors duration-[var(--duration-fast)]",
                      "hover:bg-[var(--color-surface-2)]",
                      pending && "opacity-60",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-md",
                        "transition-colors duration-[var(--duration-fast)]",
                        task.done
                          ? "bg-[var(--color-ink-3)]"
                          : "border-[1.5px] border-[var(--color-line-2)]",
                      )}
                    >
                      {task.done && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6.2l2.4 2.4L9.5 4"
                            stroke="var(--color-surface)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>

                    <span
                      className={cn(
                        "min-w-0 flex-1 break-words text-[length:var(--text-sm)]",
                        task.done &&
                          "text-[var(--color-ink-3)] line-through",
                      )}
                    >
                      {task.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setWantsOpen((v) => !v)}
        className={cn(
          "flex h-11 items-center gap-2 rounded-full px-4",
          "border border-[var(--color-line-2)] bg-[var(--color-surface)]",
          "text-[length:var(--text-sm)]",
          "shadow-[0_4px_16px_-4px_rgb(0_0_0/0.35)]",
          "transition-[border-color,box-shadow] duration-[var(--duration-fast)]",
          "hover:border-[var(--color-accent)]",
        )}
      >
        {/*
          Sayı ŞERİDİN kendisi: "bugün ne kaldı" sorusunun cevabı
          panel açılmadan görünmeli, yoksa şerit yalnızca bir düğme
          olur ve her bakışta bir tıklama ister.
        */}
        <span className="tabular font-medium">
          {openCount > 0 ? openCount : done}
        </span>
        <span className="text-[var(--color-ink-3)]">
          {openCount > 0 ? "iş kaldı" : "gün tamam"}
        </span>

        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={cn(
            "text-[var(--color-ink-3)]",
            "transition-transform duration-[var(--duration-fast)]",
            open && "rotate-180",
          )}
        >
          <path
            d="M2.5 4.5L6 8l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
