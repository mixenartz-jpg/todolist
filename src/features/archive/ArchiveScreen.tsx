"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { todayStr } from "@/lib/date/date";
import { formatLongDate } from "@/lib/ui/tr";
import { ScreenBody } from "@/components/Screen";
import { EmptyState } from "@/components/EmptyState";
import { CheckIcon } from "@/components/icons";
import { Toast, useToast } from "@/components/Toast";
import { useTasks } from "@/features/tasks/queries";
import { useSetTaskNote } from "@/features/tasks/mutations";
import { normalizeNoteInput, shouldPersistNote, TASK_NOTE_MAX } from "@/features/tasks/note";
import type { Task } from "@/features/tasks/types";
import { groupByCompletedDay } from "./archive";

/**
 * Arşiv — "ne yaptım" ekranı.
 *
 * ── Neden sekme değil? ──
 * Üst çubukta beş sekme var ve altıncısı 320px'te etiketleri kırpma
 * sınırına dayıyor (bkz. `nav-bar.css`). Arşiv geçmişe bakma işi ve
 * günlük akışın parçası değil: İstatistik'ten ve Bugün'ün gün
 * kapanışından ulaşılıyor.
 *
 * ── Saat değil, GÜNLÜK ──
 * Bitmiş her görevin altına serbest not yazılabiliyor ("50 soru
 * çözdüm, 42 doğru"). Bu, kaldırılan saat sisteminin yerini alan şey:
 * "ne kadar sürdü" sorusunu ölçemiyoruz ama "ne yaptım" sorusunu
 * kullanıcı kendi cümlesiyle cevaplayabiliyor — ve o cümle, bir
 * dakika sayısından daha çok şey söylüyor.
 *
 * Not için YENİ SÜTUN YOK: `tasks.note` 0001'den beri var (≤2000
 * karakter). Tek eksik olan "hangi gün bitti" bilgisiydi ve onu 0017
 * getirdi.
 */
export function ArchiveScreen() {
  const today = todayStr();
  const toast = useToast();

  const tasksQuery = useTasks();
  const setTaskNote = useSetTaskNote(toast.show);

  const days = useMemo(
    () => groupByCompletedDay(tasksQuery.data ?? []),
    [tasksQuery.data],
  );

  const isLoading = tasksQuery.isPending;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[var(--color-line)] px-4 py-4 md:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
            Arşiv
          </h1>
          <p className="mt-0.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            Bitirdiğin işler, gün gün
          </p>
        </div>
      </header>

      <ScreenBody width="2xl">
        {isLoading ? (
          <ArchiveSkeleton />
        ) : days.length === 0 ? (
          <EmptyState
            icon={<CheckIcon size={22} />}
            title="Arşiv henüz boş"
            /* Boş durum ÖĞRETİR: buraya nasıl bir şey düşeceğini
               anlatıyor, "kayıt yok" demiyor. */
            description="Bir görevi tamamladığında burada gününe göre birikir. Her işin altına ne yaptığını yazabilirsin — 'ne kadar sürdü' değil, 'ne oldu'."
            actionLabel="Bugüne git"
            actionHref="/bugun"
          />
        ) : (
          <div className="flex flex-col gap-[var(--stack-gap)]">
            {days.map((day) => (
              <section key={day.date}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
                    {day.date === today ? "Bugün" : formatLongDate(day.date)}
                  </h2>

                  {/*
                    Arşiv geçmişe bakma yeri: ton NÖTR. Kutlama da
                    suçlama da yok, yalnızca sayı. "3 iş" bir gerçek;
                    "sadece 3 iş" bir yargı olurdu.
                  */}
                  <span className="tabular shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                    {day.tasks.length} iş
                  </span>
                </div>

                <ul className="flex flex-col gap-1.5">
                  {day.tasks.map((task) => (
                    <ArchiveRow
                      key={task.id}
                      task={task}
                      onSetNote={(note) =>
                        setTaskNote.mutate({ id: task.id, note })
                      }
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </ScreenBody>

      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </div>
  );
}

/**
 * Arşivde bir satır: biten görev + altına yazılan günlük.
 *
 * Not alanı TIKLAYINCA açılıyor, hep açık durmuyor: on işlik bir
 * günde on boş metin kutusu, sayfayı bir forma çevirirdi. Notu OLAN
 * satırlar notu doğrudan gösteriyor — yazılmış bir şeyi okumak için
 * tıklamak gerekmemeli.
 */
function ArchiveRow({
  task,
  onSetNote,
}: {
  task: Task;
  onSetNote: (note: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-md bg-[var(--color-ink-3)]"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6.2l2.4 2.4L9.5 4"
              stroke="var(--color-surface)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="min-w-0 flex-1 break-words text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {task.title}
        </span>
      </div>

      {editing ? (
        <NoteField
          task={task}
          onClose={() => setEditing(false)}
          onSetNote={onSetNote}
        />
      ) : task.note ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "mt-2 w-full rounded-md px-1 py-0.5 -mx-1 text-left",
            "text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-3)]",
            "transition-colors duration-[var(--duration-fast)]",
            "hover:bg-[var(--color-surface-2)]",
          )}
        >
          {task.note}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "mt-1.5 rounded-md px-1 py-0.5 -mx-1",
            "text-[length:var(--text-xs)] text-[var(--color-ink-4)]",
            "transition-colors duration-[var(--duration-fast)]",
            "hover:text-[var(--color-accent)]",
          )}
        >
          + ne yaptın?
        </button>
      )}
    </li>
  );
}

/**
 * Günlük yazma alanı.
 *
 * Blur kaydeder, Esc geri alır — `TaskDetails`'in not alanıyla aynı
 * sözleşme. İki yerde aynı iş, aynı davranmalı.
 */
function NoteField({
  task,
  onClose,
  onSetNote,
}: {
  task: Task;
  onClose: () => void;
  onSetNote: (note: string | null) => void;
}) {
  const [value, setValue] = useState(task.note ?? "");
  const cancelled = useRef(false);

  function commit() {
    onClose();
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }

    const next = normalizeNoteInput(value);
    if (shouldPersistNote(task.note, next)) onSetNote(next ?? null);
  }

  return (
    <textarea
      autoFocus
      rows={2}
      maxLength={TASK_NOTE_MAX}
      value={value}
      placeholder="Ne yaptın? (ör. 50 soru çözdüm, 42 doğru)"
      aria-label={`${task.title}: günlük`}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          /*
           * Bayrak + blur: `onClose()` odağı eşzamanlı bırakmıyor ve
           * React alanı sökerken tarayıcı yine bir blur gönderiyor —
           * yani Esc, tam da iptal etmesi gereken yazıyı kaydederdi
           * (aynı gerekçe `TitleEditor`'da).
           */
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "mt-2 w-full resize-y rounded-md bg-[var(--color-surface-2)] px-2 py-1.5",
        "text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)] outline-none",
        "ring-1 ring-[var(--color-line-2)] focus:ring-[var(--color-accent)]",
        "placeholder:text-[var(--color-ink-4)]",
      )}
    />
  );
}

function ArchiveSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
          style={{ animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}
