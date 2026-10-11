"use client";

import { useState } from "react";
import { Screen, ScreenHeader, ScreenBody } from "@/components/Screen";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Toast, useToast } from "@/components/Toast";
import { ListIcon } from "@/components/icons";
import { todayStr } from "@/lib/date/date";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import { formatProgress, formatShortDate } from "@/lib/ui/tr";
import type { DateStr } from "@/lib/date/types";
import {
  useArchiveRoutine,
  useChangeSchedule,
  useCreateRoutine,
  useDeleteRoutine,
  useReorderRoutines,
  useUpdateRoutine,
} from "./mutations";
import { ReorderButtons } from "@/features/planlama/ReorderButtons";
import { planMoveTo, planReorder } from "@/features/planlama/reorder";
import { useRoutines } from "./queries";
import { RoutineForm } from "./RoutineForm";
import { groupRoutines, planMoveToGroup, type RoutineGroup } from "./groups";
import { CategoryManager } from "@/features/planlama/CategoryManager";
import { CategoryDot } from "@/features/planlama/CategoryDot";
import { useCategories } from "@/features/planlama/queries";
import type { Category } from "@/features/planlama/types";

/** Kategoriler yüklenene kadar kararlı boş dizi — her çizimde yenisi olmasın. */
const EMPTY_CATEGORIES: readonly Category[] = [];
import { describeSchedule, scheduleAt } from "./schedule";
import type { RoutineDraft, RoutineWithSchedule } from "./types";
import "@/components/list-motion.css";

export function RoutineList() {
  const { data: routines = [], isPending } = useRoutines();
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const [editing, setEditing] = useState<string | null>(null);
  /**
   * Yeni rutin formu nerede açık? `null` → kapalı. Kategori kimliği
   * formun ön seçimi: grubun "Rutin ekle"si o gruba ekler.
   */
  const [creating, setCreating] = useState<{ categoryId: string | null } | null>(
    null,
  );
  /** Kategori yönetimi paneli açık mı? */
  const [managing, setManaging] = useState(false);
  /** Silinmesi onay bekleyen rutin. Ad da tutulur: onay metni rutinin
   *  adını söylemeli, kullanıcı neyi sildiğini görmeli. */
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const toast = useToast();

  const create = useCreateRoutine();
  const update = useUpdateRoutine();
  const changeSchedule = useChangeSchedule();
  const archive = useArchiveRoutine();
  const remove = useDeleteRoutine();
  const reorder = useReorderRoutines(toast.show);

  /*
   * Sürükle-bırak: sürüklenen rutin ve altında durulan satır (ya da
   * grup başlığı). Fare kısayolu — dokunma ve klavye satırdaki
   * yukarı/aşağı düğmelerini, kategori değiştirmek için düzenleme
   * formunu kullanır.
   */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const today = todayStr();
  /*
   * Süresi biten (0026): son günü GEÇMİŞ, arşivlenmemiş rutin. Aktif
   * listede durursa kullanıcı onu hâlâ sürüyor sanır; arşive karışırsa
   * "vazgeçtiğim" ile "bitirdiğim" ayırt edilemez.
   */
  const isEnded = (r: RoutineWithSchedule) =>
    r.endDate !== null && r.endDate < today;
  const active = routines.filter((r) => r.archivedAt === null && !isEnded(r));
  const ended = routines.filter((r) => r.archivedAt === null && isEnded(r));
  const archived = routines.filter((r) => r.archivedAt !== null);

  const groups = groupRoutines(active, categories);
  /* Hiç kategori yoksa tek grup "Kategorisiz"dir ve başlığı gürültü
     olurdu: ekran kategorilerden önceki hâliyle aynı görünür. */
  const showHeadings = !(groups.length === 1 && groups[0].category === null);

  function handleCreate(draft: RoutineDraft) {
    create.mutate(draft, {
      onSuccess: () => setCreating(null),
      onError: (error) => toast.show(errorText(error)),
    });
  }

  function handleUpdate(routine: RoutineWithSchedule, draft: RoutineDraft) {
    update.mutate(
      {
        id: routine.id,
        name: draft.name,
        icon: draft.icon,
        colorSlot: draft.colorSlot,
        target: draft.target,
        unit: draft.unit,
        // Yalnızca değiştiyse yazılır (migration öncesi düzenleme bozulmasın).
        ...(draft.endDate !== routine.endDate && { endDate: draft.endDate }),
        ...(draft.categoryId !== routine.categoryId && {
          categoryId: draft.categoryId,
        }),
      },
      {
        onError: (error) => toast.show(errorText(error)),
        onSuccess: () => {
          const current = scheduleAt(routine, todayStr());
          // Program yalnızca gerçekten değiştiyse yeni sürüm yazılır —
          // her düzenlemede sürüm biriktirmenin anlamı yok.
          if (JSON.stringify(current) !== JSON.stringify(draft.schedule)) {
            changeSchedule.mutate(
              { routineId: routine.id, schedule: draft.schedule },
              { onError: (error) => toast.show(errorText(error)) },
            );
          }
          setEditing(null);
        },
      },
    );
  }

  /**
   * Sürüklenen rutini `group`'un `index` konumuna bırakır. Aynı grupta
   * yalnızca sıra değişir; başka gruptaysa kategori de değişir.
   * `index` = grup uzunluğu → sona (başlığa bırakma).
   */
  function handleDrop(group: RoutineGroup<RoutineWithSchedule>, index: number) {
    const from = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (from === null) return;

    const moved = active.find((r) => r.id === from);
    if (moved === undefined) return;

    const targetCategoryId = group.category?.id ?? null;
    const sameGroup = group.routines.some((r) => r.id === from);

    if (sameGroup) {
      const to = Math.min(index, group.routines.length - 1);
      const patches = planMoveTo(group.routines, from, to);
      if (patches.length > 0) reorder.mutate({ patches });
      return;
    }

    reorder.mutate({
      patches: planMoveToGroup(group.routines, moved, index),
      move: { id: from, categoryId: targetCategoryId },
    });
  }

  /** Bırakma çizgisi: aşağı taşınan hedefin altına, yukarı taşınan üstüne. */
  function dropEdgeOf(
    group: RoutineGroup<RoutineWithSchedule>,
    index: number,
  ): "top" | "bottom" | null {
    if (draggingId === null || group.routines[index].id !== dragOverId) return null;
    const from = group.routines.findIndex((r) => r.id === draggingId);
    if (from === index) return null;
    // Başka gruptan gelen rutin hedefin yerini alır: üstüne düşer.
    return from !== -1 && from < index ? "bottom" : "top";
  }

  function renderForm(initialCategoryId: string | null) {
    return (
      <div className="mb-2 rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-4 text-[length:var(--text-lg)] font-medium">
          Yeni rutin
        </h2>
        <RoutineForm
          initial={{ categoryId: initialCategoryId }}
          submitLabel="Oluştur"
          pending={create.isPending}
          otherRoutines={active}
          categories={categories}
          onSubmit={handleCreate}
          onCancel={() => setCreating(null)}
        />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 p-5" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-[var(--color-surface-2)]"
          />
        ))}
      </div>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Rutinler"
        width="2xl"
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={managing}
              onClick={() => setManaging((open) => !open)}
            >
              Kategoriler
            </Button>
            {creating === null && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreating({ categoryId: null })}
              >
                Yeni rutin
              </Button>
            )}
          </div>
        }
      />

      <ScreenBody width="2xl">
        {/*
          Kategoriler görevlerle ORTAK (0027): Planlama'daki "Matematik"
          burada da aynı adla ve renkle görünür. Yönetici de aynı
          bileşen — yeniden adlandırma, renk, arşiv, silme tek yerden.
        */}
        {managing && (
          <div className="mb-5 rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4">
            <h2 className="mb-1 text-[length:var(--text-lg)] font-medium">
              Kategoriler
            </h2>
            <p className="mb-4 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
              Kategori aç, sonra içine rutin ekle. Kategoriler görevlerle
              ortaktır.
            </p>
            <CategoryManager categories={categories} onError={toast.show} />
          </div>
        )}

        {/* Başlıktaki "Yeni rutin" listenin ÜSTÜNDE açılır; grubun
            kendi "Rutin ekle"si o grubun içinde. */}
        {creating !== null &&
          (!showHeadings || creating.categoryId === null) &&
          renderForm(creating.categoryId)}

        {active.length === 0 && categories.length === 0 && creating === null ? (
          <EmptyState
            icon={<ListIcon size={22} />}
            title="Henüz rutin yok"
            description="İlk rutinini ekle. Her gün tekrarlayan bir şey olabilir, haftanın belirli günleri ya da haftada birkaç kez."
          >
            <Button
              variant="primary"
              className="mt-5"
              onClick={() => setCreating({ categoryId: null })}
            >
              Rutin ekle
            </Button>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => {
              const key = group.category?.id ?? "__none__";
              const groupOver = draggingId !== null && dragOverId === `group:${key}`;

              return (
                <section
                  key={key}
                  aria-label={group.category?.name ?? "Kategorisiz"}
                  /*
                   * Grup da bir bırakma hedefi: başlığa ya da boşluğa
                   * bırakılan rutin grubun SONUNA eklenir. Boş bir
                   * kategoriye rutin taşımanın tek sürükleme yolu bu.
                   */
                  onDragOver={
                    draggingId !== null
                      ? (event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDragOverId(`group:${key}`);
                        }
                      : undefined
                  }
                  onDrop={
                    draggingId !== null
                      ? (event) => {
                          event.preventDefault();
                          handleDrop(group, group.routines.length);
                        }
                      : undefined
                  }
                  className={cn(
                    "rounded-xl transition-colors duration-[var(--duration-fast)]",
                    groupOver && "bg-[var(--color-surface-2)]",
                  )}
                >
                  {showHeadings && (
                    <div className="mb-2 flex items-center gap-2">
                      {group.category && (
                        <CategoryDot category={group.category} size={9} />
                      )}
                      <h2 className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
                        {group.category?.name ?? "Kategorisiz"}
                      </h2>
                      <span className="tabular text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                        {group.routines.length}
                      </span>
                      {/* Kategorisiz grubun ekleme yolu başlıktaki
                          "Yeni rutin". */}
                      {group.category && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto"
                          onClick={() =>
                            setCreating({ categoryId: group.category?.id ?? null })
                          }
                        >
                          + Rutin ekle
                        </Button>
                      )}
                    </div>
                  )}

                  {showHeadings &&
                    group.category !== null &&
                    creating?.categoryId === group.category.id &&
                    renderForm(group.category.id)}

                  {group.routines.length === 0 ? (
                    showHeadings && (
                      <p className="rounded-lg border border-dashed border-[var(--color-line)] px-3.5 py-3 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                        Bu kategoride henüz rutin yok.
                      </p>
                    )
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {group.routines.map((routine, index) => {
                        const draggable =
                          editing !== routine.id && active.length > 1;
                        const edge = dropEdgeOf(group, index);

                        return (
                          <li
                            key={routine.id}
                            draggable={draggable || undefined}
                            onDragStart={
                              draggable
                                ? (event) => {
                                    /* Firefox veri yazılmadan sürüklemeyi başlatmıyor. */
                                    event.dataTransfer.setData("text/plain", routine.name);
                                    event.dataTransfer.effectAllowed = "move";
                                    setDraggingId(routine.id);
                                  }
                                : undefined
                            }
                            onDragEnd={() => {
                              setDraggingId(null);
                              setDragOverId(null);
                            }}
                            onDragOver={
                              draggingId !== null
                                ? (event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    event.dataTransfer.dropEffect = "move";
                                    setDragOverId(routine.id);
                                  }
                                : undefined
                            }
                            onDrop={
                              draggingId !== null
                                ? (event) => {
                                    event.preventDefault();
                                    // Grup da bırakma hedefi; ikisi birden çalışmasın.
                                    event.stopPropagation();
                                    handleDrop(group, index);
                                  }
                                : undefined
                            }
                            className={cn(
                              "rounded-lg",
                              draggable && "cursor-grab active:cursor-grabbing",
                              /* Çizgi satırlar arasındaki boşluğa düşer (bkz. TaskItem). */
                              edge === "top" && "shadow-[0_-3px_0_0_var(--color-accent)]",
                              edge === "bottom" && "shadow-[0_3px_0_0_var(--color-accent)]",
                            )}
                          >
                            {editing === routine.id ? (
                              <div className="rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4">
                                <RoutineForm
                                  initial={{
                                    name: routine.name,
                                    colorSlot: routine.colorSlot,
                                    target: routine.target,
                                    unit: routine.unit,
                                    schedule:
                                      scheduleAt(routine, todayStr()) ?? { kind: "daily" },
                                    endDate: routine.endDate,
                                    categoryId: routine.categoryId,
                                  }}
                                  submitLabel="Kaydet"
                                  pending={update.isPending || changeSchedule.isPending}
                                  otherRoutines={active.filter((r) => r.id !== routine.id)}
                                  categories={categories}
                                  onSubmit={(draft) => handleUpdate(routine, draft)}
                                  onCancel={() => setEditing(null)}
                                />
                              </div>
                            ) : (
                              <RoutineRow
                                routine={routine}
                                reorder={
                                  group.routines.length > 1 ? (
                                    <ReorderButtons
                                      title={routine.name}
                                      isFirst={index === 0}
                                      isLast={index === group.routines.length - 1}
                                      className=""
                                      onMove={(delta) => {
                                        const patches = planReorder(
                                          group.routines,
                                          routine.id,
                                          delta,
                                        );
                                        if (patches.length > 0) reorder.mutate({ patches });
                                      }}
                                    />
                                  ) : undefined
                                }
                                onEdit={() => setEditing(routine.id)}
                                onArchive={() =>
                                  archive.mutate(
                                    { id: routine.id, archived: true },
                                    { onError: (error) => toast.show(errorText(error)) },
                                  )
                                }
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {ended.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-3)]">
              Süresi biten
            </h2>
            <p className="mb-3 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
              Son günü geçen rutinler artık zorunlu değil; geçmiş kayıtları
              korunur. Devam ettirmek için süresini uzat.
            </p>
            <ul className="flex flex-col gap-2">
              {ended.map((routine) => (
                <li key={routine.id}>
                  {editing === routine.id ? (
                    <div className="rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4">
                      <RoutineForm
                        initial={{
                          name: routine.name,
                          colorSlot: routine.colorSlot,
                          target: routine.target,
                          unit: routine.unit,
                          schedule: scheduleAt(routine, today) ?? { kind: "daily" },
                          endDate: routine.endDate,
                          categoryId: routine.categoryId,
                        }}
                        submitLabel="Kaydet"
                        pending={update.isPending || changeSchedule.isPending}
                        otherRoutines={active}
                        categories={categories}
                        onSubmit={(draft) => handleUpdate(routine, draft)}
                        onCancel={() => setEditing(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 opacity-70">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: slotVar(routine.colorSlot) }}
                      />
                      <span className="mr-auto min-w-0">
                        <span className="block truncate text-[length:var(--text-base)]">
                          {routine.name}
                        </span>
                        <span className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                          {formatShortDate(routine.endDate as DateStr)} tarihinde bitti
                        </span>
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(routine.id)}>
                        Uzat
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          archive.mutate(
                            { id: routine.id, archived: true },
                            { onError: (error) => toast.show(errorText(error)) },
                          )
                        }
                      >
                        Arşivle
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {archived.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-3)]">
              Arşiv
            </h2>
            <p className="mb-3 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
              Arşivlenen rutinler bugünden sonra zorunlu değildir; geçmiş
              kayıtları ve istatistikleri korunur.
            </p>
            <ul className="flex flex-col gap-2">
              {archived.map((routine) => (
                <li
                  key={routine.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 opacity-60"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: slotVar(routine.colorSlot) }}
                  />
                  <span className="mr-auto text-[length:var(--text-base)]">
                    {routine.name}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      archive.mutate({ id: routine.id, archived: false })
                    }
                  >
                    Geri al
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      setPendingDelete({ id: routine.id, name: routine.name })
                    }
                  >
                    Sil
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </ScreenBody>

      {pendingDelete && (
        <ConfirmDialog
          title="Rutini sil"
          description={`"${pendingDelete.name}" ve tüm geçmiş kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          confirmLabel="Kalıcı olarak sil"
          pending={remove.isPending}
          /*
           * Diyalog silme bitene kadar açık kalır ve onay düğmesi
           * yükleniyor durumunu gösterir. `setPendingDelete(null)`
           * hemen çağrılsaydı diyalog aynı commit'te sökülür ve
           * `remove.isPending` hiçbir render'da görünmezdi.
           */
          onConfirm={() =>
            remove.mutate(pendingDelete.id, {
              onSuccess: () => setPendingDelete(null),
              onError: (error) => {
                toast.show(errorText(error));
                setPendingDelete(null);
              },
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
    </Screen>
  );
}

function RoutineRow({
  routine,
  reorder,
  onEdit,
  onArchive,
}: {
  routine: RoutineWithSchedule;
  /** Yukarı/aşağı düğmeleri — tek rutinde verilmez. */
  reorder?: React.ReactNode;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const schedule = scheduleAt(routine, todayStr());

  return (
    <div
      className={cn(
        "revealOnHover flex items-center gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-3",
        "transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-line-2)]",
      )}
    >
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: slotVar(routine.colorSlot) }}
      />

      <div className="mr-auto min-w-0">
        <div className="truncate text-[length:var(--text-base)]">
          {routine.name}
        </div>
        <div className="mt-0.5 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          {schedule ? describeSchedule(schedule) : "Program yok"}
          {routine.target > 1 &&
            ` · ${formatProgress(routine.target, routine.target, routine.unit)}`}
          {routine.endDate !== null &&
            ` · ${formatShortDate(routine.endDate)} tarihine kadar`}
        </div>
      </div>

      <div className="revealTarget flex items-center gap-1 opacity-0 transition-opacity duration-[var(--duration-fast)]">
        {reorder}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Düzenle
        </Button>
        <Button size="sm" variant="ghost" onClick={onArchive}>
          Arşivle
        </Button>
      </div>
    </div>
  );
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Bir hata oluştu";
}
