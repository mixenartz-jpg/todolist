"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { NoteIcon } from "@/components/icons";
import { Toast, useToast } from "@/components/Toast";
import { todayStr } from "@/lib/date/date";
import { cn } from "@/lib/ui/cn";
import { formatLongDate } from "@/lib/ui/tr";
import { useCreateNote, useDeleteNote, useUpdateNote } from "./mutations";
import { NoteForm } from "./NoteForm";
import { NoteItem } from "./NoteItem";
import { useNotes } from "./queries";
import { displayTitle, groupByDate, searchNotes, sortNotes, type SortOrder } from "./search";
import type { Note, NoteDraft } from "./types";

export function JournalScreen() {
  const today = useMemo(() => todayStr(), []);
  const toast = useToast();

  const { data: notes = [], isPending, error } = useNotes();

  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<SortOrder>("newest");

  const create = useCreateNote(toast.show);
  const update = useUpdateNote(toast.show);
  const remove = useDeleteNote(toast.show);

  const groups = useMemo(
    () => groupByDate(sortNotes(searchNotes(notes, query), order)),
    [notes, query, order],
  );

  const matchCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.notes.length, 0),
    [groups],
  );

  function handleCreate(draft: NoteDraft) {
    create.mutate(draft, { onSuccess: () => setComposing(false) });
  }

  function handleUpdate(draft: NoteDraft) {
    if (!editing) return;
    update.mutate(
      { id: editing.id, draft },
      { onSuccess: () => setEditing(null) },
    );
  }

  const searching = query.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--color-line)] px-4 py-3 md:px-6">
        <h1 className="mr-auto text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
          Notlar
        </h1>
        {!composing && !editing && (
          <Button variant="primary" size="sm" onClick={() => setComposing(true)}>
            Yeni not
          </Button>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        {/* Hata boş durum GİBİ gösterilmez. "Henüz not yok" demek,
            veriler yüklenememişken kullanıcıya notlarının silindiğini
            düşündürür. */}
        {error && (
          <p
            role="alert"
            className="text-[length:var(--text-sm)] text-[var(--color-danger)]"
          >
            Notlar yüklenemedi: {error.message}
          </p>
        )}

        {composing && (
          <section className="rounded-xl bg-[var(--color-surface)] p-4 shadow-[var(--shadow-raised),var(--sheen-top)]">
            <h2 className="mb-3.5 text-[length:var(--text-lg)] font-medium">
              Yeni not
            </h2>
            <NoteForm
              defaultDate={today}
              submitLabel="Kaydet"
              pending={create.isPending}
              onSubmit={handleCreate}
              onCancel={() => setComposing(false)}
            />
          </section>
        )}

        {editing && (
          <section className="rounded-xl bg-[var(--color-surface)] p-4 shadow-[var(--shadow-raised),var(--sheen-top)]">
            <h2 className="mb-3.5 text-[length:var(--text-lg)] font-medium">
              Notu düzenle
            </h2>
            <NoteForm
              initial={{
                title: editing.title,
                body: editing.body,
                date: editing.date,
              }}
              defaultDate={today}
              submitLabel="Kaydet"
              pending={update.isPending}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          </section>
        )}

        {isPending ? (
          <JournalSkeleton />
        ) : error ? null : notes.length === 0 && !composing ? (
          <EmptyState
            icon={<NoteIcon size={22} />}
            title="Henüz not yok"
            description="Aklından geçeni yaz. Her notun bir tarihi olur; aynı güne istediğin kadar not ekleyebilirsin."
          >
            <Button
              variant="primary"
              className="mt-5"
              onClick={() => setComposing(true)}
            >
              İlk notunu yaz
            </Button>
          </EmptyState>
        ) : (
          <>
            {/* Arama ve sıralama yalnızca gezinmeye değecek kadar not
                varken gösterilir: iki notluk bir listede arama kutusu
                yardımcı olmaz, yer kaplar. */}
            {notes.length > 1 && (
              <div className="flex items-center gap-2">
                <SearchField value={query} onChange={setQuery} />
                <SortToggle order={order} onChange={setOrder} />
              </div>
            )}

            {searching && (
              <p
                aria-live="polite"
                className="-mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]"
              >
                {matchCount === 0
                  ? "Eşleşen not yok"
                  : `${matchCount} not bulundu`}
              </p>
            )}

            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <section key={group.date}>
                  <h2 className="mb-2 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
                    {formatLongDate(group.date)}
                    {group.date === today && (
                      <span className="ml-1.5 text-[var(--color-accent)]">
                        bugün
                      </span>
                    )}
                  </h2>

                  <ul className="flex flex-col gap-2">
                    {group.notes.map((note) => (
                      <NoteItem
                        key={note.id}
                        note={note}
                        onEdit={() => {
                          setComposing(false);
                          setEditing(note);
                        }}
                        onDelete={() => setPendingDelete(note)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Notu sil"
          description={`"${displayTitle(pendingDelete, 60)}" kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          confirmLabel="Sil"
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(pendingDelete.id, {
              onSuccess: () => {
                // Silinen not düzenleniyorduysa form da kapanmalı,
                // aksi halde var olmayan bir notu kaydetmeye çalışır.
                if (editing?.id === pendingDelete.id) setEditing(null);
                setPendingDelete(null);
              },
              onError: () => setPendingDelete(null),
            })
          }
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <Toast
        message={toast.message}
        variant={toast.variant}
        token={toast.token}
        onDismiss={toast.dismiss}
      />
    </div>
  );
}

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="relative flex-1">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)]"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M10.5 10.5L14 14"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Notlarda ara"
        aria-label="Notlarda ara"
        className="h-10 w-full rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] pl-9 pr-3 text-[length:var(--text-base)] outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-accent)]"
      />
    </div>
  );
}

/**
 * Sıralama düğmesi.
 *
 * Açılır menü değil tek düğme: yalnızca iki seçenek var ve menü açmak
 * iki durumlu bir tercih için fazla adım. Düğme mevcut durumu yazar.
 */
function SortToggle({
  order,
  onChange,
}: {
  order: SortOrder;
  onChange: (next: SortOrder) => void;
}) {
  const newest = order === "newest";

  return (
    <button
      type="button"
      onClick={() => onChange(newest ? "oldest" : "newest")}
      aria-label={`Sıralama: ${newest ? "yeniden eskiye" : "eskiden yeniye"}. Değiştirmek için tıkla.`}
      className={cn(
        "flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-line-2)] px-3",
        "text-[length:var(--text-sm)] text-[var(--color-ink-2)]",
        "transition-[color,background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]",
        "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] active:scale-[0.97]",
      )}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className={cn(
          "transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-expo)]",
          !newest && "rotate-180",
        )}
      >
        <path
          d="M8 3v10M4.5 9.5L8 13l3.5-3.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {newest ? "Yeni" : "Eski"}
    </button>
  );
}

function JournalSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {[64, 96, 72, 88].map((h, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl bg-[var(--color-surface-2)]"
          style={{ height: h, animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}
