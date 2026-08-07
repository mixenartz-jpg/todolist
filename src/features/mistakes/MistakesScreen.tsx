"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { CrossIcon } from "@/components/icons";
import { Toast, useToast } from "@/components/Toast";
import { todayStr } from "@/lib/date/date";
import { MistakeForm } from "./MistakeForm";
import { MistakeItem } from "./MistakeItem";
import {
  useCreateMistake,
  useDeleteMistake,
  useUpdateMistake,
} from "./mutations";
import { EMPTY_MISTAKES, useMistakes } from "./queries";
import { buildTally, filterBySelection } from "./tally";
import { TallyTable, type Selection } from "./TallyTable";
import type { Mistake } from "./types";

/**
 * Yanlış çetelesi ekranı.
 *
 * Üstte ders/konu kırılımlı sayım tablosu, altında yanlışların listesi.
 * Tablodan bir konu seçilince liste ona daralır: özet ve detay aynı
 * ekranda, gezinmeden.
 */
export function MistakesScreen() {
  const today = useMemo(() => todayStr(), []);
  const toast = useToast();

  const { data, isPending, error } = useMistakes();
  const mistakes = data ?? EMPTY_MISTAKES;

  const createMistake = useCreateMistake(toast.show);
  const updateMistake = useUpdateMistake(toast.show);
  const deleteMistake = useDeleteMistake(toast.show);

  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Mistake | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Mistake | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const tally = useMemo(() => buildTally(mistakes, today), [mistakes, today]);
  const visible = useMemo(
    () => filterBySelection(mistakes, selection),
    [mistakes, selection],
  );

  function closeForm() {
    setComposing(false);
    setEditing(null);
  }

  const formOpen = composing || editing !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--color-line)] px-4 py-3 md:px-6">
        <h1 className="mr-auto text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
          Yanlışlar
        </h1>
        {!formOpen && (
          <Button variant="primary" size="sm" onClick={() => setComposing(true)}>
            Yanlış ekle
          </Button>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        {/* Hata ÖNCE gelir. Hatayı boş durum gibi göstermek "verilerin
            gitti" demek olurdu — oysa yalnızca yüklenemedi. */}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-[var(--color-danger)] bg-[color-mix(in_oklch,var(--color-danger)_12%,transparent)] px-3.5 py-2.5 text-[length:var(--text-sm)]"
          >
            Yanlışlar yüklenemedi: {error.message}
          </p>
        )}

        {formOpen && (
          <MistakeForm
            key={editing?.id ?? "new"}
            initial={editing ?? undefined}
            history={mistakes}
            defaultDate={today}
            submitLabel={editing ? "Kaydet" : "Ekle"}
            pending={createMistake.isPending || updateMistake.isPending}
            onError={toast.show}
            onCancel={closeForm}
            onSubmit={(draft) => {
              if (editing) {
                updateMistake.mutate(
                  { mistake: editing, draft },
                  { onSuccess: closeForm },
                );
              } else {
                createMistake.mutate(draft, { onSuccess: closeForm });
              }
            }}
          />
        )}

        {isPending ? (
          <MistakesSkeleton />
        ) : error ? null : mistakes.length === 0 ? (
          !formOpen && (
            <EmptyState
              icon={<CrossIcon size={22} />}
              title="Henüz yanlış yok"
              description="Çözdüğün sorularda yaptığın yanlışları ekran görüntüsü ve notla kaydet. Hangi konuda takıldığını çetele tablosunda göreceksin."
            />
          )
        ) : (
          <>
            <TallyTable
              tally={tally}
              selection={selection}
              onSelect={setSelection}
            />

            {selection && (
              <div className="flex items-center gap-2">
                <span
                  aria-live="polite"
                  className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]"
                >
                  {selection.ders} · {selection.konu} — {visible.length} yanlış
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelection(null)}
                >
                  Filtreyi kaldır
                </Button>
              </div>
            )}

            <ul className="flex flex-col gap-2">
              {visible.map((mistake) => (
                <MistakeItem
                  key={mistake.id}
                  mistake={mistake}
                  onEdit={() => {
                    setComposing(false);
                    setEditing(mistake);
                  }}
                  onDelete={() => setPendingDelete(mistake)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Yanlış silinsin mi?"
          description={`"${pendingDelete.ders} · ${pendingDelete.konu}" kaydı ve varsa ekran görüntüsü kalıcı olarak silinecek.`}
          confirmLabel="Sil"
          pending={deleteMistake.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() =>
            deleteMistake.mutate(pendingDelete, {
              onSettled: () => setPendingDelete(null),
            })
          }
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

function MistakesSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
          style={{ animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}
