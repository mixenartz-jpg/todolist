"use client";

import { useEffect } from "react";
import { cn } from "@/lib/ui/cn";
import { useToggleTask } from "@/features/tasks/mutations";
import type { Task } from "@/features/tasks/types";
import { useZenTimer } from "./useZenTimer";
import { formatElapsed } from "./zen";
import "./zen.css";

/**
 * Zen odak ekranı — tüm site kaybolur, tek iş kalır.
 *
 * ── Neden bu kadar boş? ──
 * Odak modunun tek işi dikkat dağıtıcıyı kaldırmak. Sekmeler, widget,
 * liste, ilerleme çubuğu: hepsi "başka bir şey de yapabilirsin"
 * diyor. Burada yalnızca görev başlığı, sayaç ve iki düğme var —
 * "bitti" ve "çık". Üçüncü bir seçenek eklemek, modun kendisini
 * çürütürdü.
 *
 * ── Sayaç kaydedilmiyor ──
 * Bkz. `zen.ts`: sayaç Zen'in AÇIK olduğu süreyi ölçüyor, çalışılan
 * süreyi değil. Kullanıcı ekranı açık bırakıp kahve içmiş olabilir.
 * Ölçmediğimiz bir şeyi kaydetmek veriyi yalancı yapar.
 */
export function ZenScreen({
  task,
  onExit,
}: {
  task: Task;
  onExit: () => void;
}) {
  const seconds = useZenTimer();
  const toggleTask = useToggleTask();

  /* Esc çıkar — tam ekran bir katmanın en beklenen kısayolu. */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onExit();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  /*
   * Zen açıkken ARKA SAYFA kaydırılamaz.
   *
   * Katman `fixed` ve tam ekran; altındaki sayfa kaydırılırsa
   * kullanıcı çıktığında bambaşka bir yerde buluyor kendini. Odak
   * modunun sözü "çıktığında bıraktığın yerdesin".
   */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function handleDone() {
    toggleTask.mutate({ id: task.id, done: true });
    onExit();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Odak modu"
      className={cn(
        "zenScreen fixed inset-0 z-[var(--z-modal)]",
        "flex flex-col items-center justify-center gap-8 px-6",
        "bg-[var(--color-bg)]",
      )}
    >
      <p className="text-[length:var(--text-xs)] font-medium uppercase tracking-[0.12em] text-[var(--color-ink-4)]">
        Odak
      </p>

      <h1 className="max-w-2xl text-center text-[length:var(--text-3xl)] font-semibold leading-tight tracking-[-0.02em] break-words">
        {task.title}
      </h1>

      {/*
        Sayaç turuncu ve ışıklı: ekrandaki tek hareketli şey ve
        ışımanın izinli olduğu dört yerden biri. `tabular` şart —
        değişen rakamlar sayıyı her saniye yatay olarak oynatırdı.
      */}
      <p
        className="zenTimer tabular text-[length:var(--text-3xl)] font-semibold text-[var(--color-accent)]"
        aria-live="off"
      >
        {formatElapsed(seconds)}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDone}
          className={cn(
            "inline-flex h-11 items-center rounded-lg px-5",
            "text-[length:var(--text-sm)] font-medium",
            "bg-[var(--color-accent)] text-[var(--color-on-accent)]",
            "transition-shadow duration-[var(--duration-fast)]",
            "hover:shadow-[var(--glow-accent-md)]",
          )}
        >
          Bitti
        </button>

        <button
          type="button"
          onClick={onExit}
          className={cn(
            "inline-flex h-11 items-center rounded-lg px-4",
            "text-[length:var(--text-sm)] text-[var(--color-ink-2)]",
            "transition-colors duration-[var(--duration-fast)]",
            "hover:text-[var(--color-ink)]",
          )}
        >
          Çık
        </button>
      </div>
    </div>
  );
}
