"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { CrossIcon } from "@/components/icons";
import { Toast, useToast } from "@/components/Toast";
import { todayStr } from "@/lib/date/date";
import { MistakeForm } from "./MistakeForm";
import { MistakeTree } from "./MistakeTree";
import {
  useAdvanceReview,
  useCreateMistake,
  useDeleteMistake,
  useRenameMistakeGroup,
  useUpdateMistake,
} from "./mutations";
import { EMPTY_MISTAKES, useMistakeImageUrl, useMistakes } from "./queries";
import { planDersRename, planKonuRename, type RenamePlan } from "./rename";
import { sortTree, type SortMode } from "./sort";
import { SortSelect } from "./SortSelect";
import { buildTree } from "./tree";
import type { Mistake } from "./types";

interface PendingRename {
  level: "ders" | "konu";
  from: string;
  to: string;
  plan: RenamePlan;
}

/**
 * Onay kutusunun metni.
 *
 * Birleştirme durumu AÇIKÇA söylenir: iki dal tek dala iner ve ikinci
 * bir yeniden adlandırmayla geri ayrılamaz. Bunu yumuşatmak,
 * kullanıcının geri alınamaz bir işlemi fark etmeden onaylaması demek
 * olurdu.
 */
function renameDescription({ level, from, to, plan }: PendingRename): string {
  const noun = level === "ders" ? "Ders" : "Konu";

  if (plan.count === 0) {
    return `Güncellenecek kayıt yok: "${from}" zaten "${to}" adını taşıyor.`;
  }

  const base = `${plan.count} kayıt güncellenecek.`;

  if (plan.merge) {
    return (
      `"${from}" kayıtları mevcut "${to}" dalına katılacak. ${base} ` +
      `Bu dalda zaten ${plan.mergeIntoCount} kayıt var — işlem iki dalı BİRLEŞTİRİR ve geri alınamaz.`
    );
  }

  return `${noun} adı "${from}" yerine "${to}" olacak. ${base}`;
}

/**
 * Yanlış çetelesi ekranı.
 *
 * Tek bir ağaç: ders → konu → yanlış → detay. Özet (sayılar, ısı, vadesi
 * gelen tekrar) üst seviyelerde durur, detay yerinde açılır — hangi
 * konuda kaç yanlış olduğu ile o yanlışların ne olduğu artık aynı
 * yapıda, gezinmeden.
 */
export function MistakesScreen() {
  const today = useMemo(() => todayStr(), []);
  const toast = useToast();

  const { data, isPending, error } = useMistakes();
  const mistakes = data ?? EMPTY_MISTAKES;

  const createMistake = useCreateMistake(toast.show);
  const updateMistake = useUpdateMistake(toast.show);
  const deleteMistake = useDeleteMistake(toast.show);
  const advanceReview = useAdvanceReview(toast.show);
  const renameGroup = useRenameMistakeGroup(toast.show);

  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Mistake | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Mistake | null>(null);
  const [pendingRename, setPendingRename] = useState<PendingRename | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("most");

  const tree = useMemo(() => buildTree(mistakes, today), [mistakes, today]);
  const sorted = useMemo(() => sortTree(tree, sortMode), [tree, sortMode]);

  // Düzenlenen kaydın mevcut görseli. Form onu gösteremezse kullanıcı
  // ekran görüntüsünün silindiğini sanar.
  const editingImage = useMistakeImageUrl(editing?.imagePath ?? null);

  function closeForm() {
    setComposing(false);
    setEditing(null);
  }

  function startEdit(mistake: Mistake) {
    setComposing(false);
    setEditing(mistake);
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
            existingImageUrl={editingImage.data ?? null}
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
              description="Çözdüğün sorularda yaptığın yanlışları ekran görüntüsü ve notla kaydet. Hangi konuda takıldığını ders ve konu kırılımında göreceksin."
            />
          )
        ) : (
          <>
            <SortSelect value={sortMode} onChange={setSortMode} />

            <MistakeTree
              tree={sorted}
              today={today}
              onEdit={startEdit}
              onDelete={setPendingDelete}
              onReviewed={(mistake) => advanceReview.mutate({ mistake, today })}
              reviewPending={advanceReview.isPending}
              onRenameDers={(ders, next) =>
                setPendingRename({
                  level: "ders",
                  from: ders.ders,
                  to: next,
                  plan: planDersRename(mistakes, ders.ders, next),
                })
              }
              onRenameKonu={(ders, konu, next) =>
                setPendingRename({
                  level: "konu",
                  from: konu.konu,
                  to: next,
                  plan: planKonuRename(mistakes, ders.ders, konu.konu, next),
                })
              }
            />
          </>
        )}
      </div>

      {pendingRename && (
        <ConfirmDialog
          title={
            pendingRename.level === "ders"
              ? "Ders yeniden adlandırılsın mı?"
              : "Konu yeniden adlandırılsın mı?"
          }
          description={renameDescription(pendingRename)}
          confirmLabel="Yeniden adlandır"
          // Yıkıcı DEĞİL: kayıtlar silinmiyor, adları değişiyor.
          confirmVariant="primary"
          pending={renameGroup.isPending}
          onCancel={() => setPendingRename(null)}
          onConfirm={() =>
            renameGroup.mutate(
              {
                ids: pendingRename.plan.ids,
                ...(pendingRename.level === "ders"
                  ? { ders: pendingRename.to }
                  : { konu: pendingRename.to }),
              },
              { onSettled: () => setPendingRename(null) },
            )
          }
        />
      )}

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
          className="h-11 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
          style={{ animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}
