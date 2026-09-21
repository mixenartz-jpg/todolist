"use client";
import { ScreenBody } from "@/components/Screen";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { formatLongDate, formatPercent, WEEKDAYS_LONG } from "@/lib/ui/tr";
import { isoWeekday } from "@/lib/date/date";
import { EmptyState } from "@/components/EmptyState";
import { CheckIcon } from "@/components/icons";
import { Toast, useToast } from "@/components/Toast";
import { isCompleted, valueOn } from "@/features/entries/completion";
import { useSetEntry } from "@/features/entries/mutations";
import { EMPTY_ENTRIES, useEntries } from "@/features/entries/queries";
import { isActiveOn, isDueOn } from "@/features/routines/schedule";
import { useRoutines } from "@/features/routines/queries";
import type { RoutineWithSchedule } from "@/features/routines/types";
import { dayScore, periodProgress } from "@/features/stats/score";
import { SectionHeading } from "@/features/sections/SectionHeading";
import {
  DayGridScreen,
  type DraftSlot,
} from "@/features/daygrid/DayGridScreen";
import {
  DayGridHeader,
  gridRangeLabel,
} from "@/features/daygrid/DayGridHeader";
import {
  DayListScreen,
  type DayListActions,
} from "@/features/daygrid/DayListScreen";
import { useDayGridSurface } from "@/features/daygrid/useDayGridSurface";
import { useGridViewMode } from "@/features/daygrid/useGridViewMode";
import { useDropDispatch } from "@/features/daygrid/useDropDispatch";
import { TaskPopover } from "@/features/taskpopover/TaskPopover";
import { useTaskPopoverActions } from "@/features/taskpopover/useTaskPopoverActions";
import { taskColorSlot } from "@/features/tasks/color";
import { TaskItem } from "@/features/tasks/TaskItem";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import { formatTime } from "@/features/tasks/schedule";
import { useCategories, categoryMap } from "@/features/planlama/queries";
import type { Task } from "@/features/tasks/types";
import {
  useCreateTask,
  useDeleteTask,
  useRenameTask,
  useRescheduleTask,
  useSetTaskTime,
  useToggleTask,
} from "@/features/tasks/mutations";
import { undatedTasks, useTasks } from "@/features/tasks/queries";
import { DayRail } from "./DayRail";
import { TodayRoutineItem } from "./TodayRoutineItem";

export function TodayScreen() {
  const surface = useDayGridSurface();
  const view = useGridViewMode();
  const today = surface.today;
  const toast = useToast();

  /*
   * "Bir ara" varsayılan olarak KAPALI: günlük akışın parçası değil ve
   * açık gelirse tarihli işlerin altında uzun bir kuyruk bırakır.
   * (Önceki `<details>` de varsayılan kapalıydı — davranış korunuyor.)
   */
  const [somedayOpen, setSomedayOpen] = useState(false);

  /**
   * Izgarada tıklanan görev — düzenleme paneli bloğun YANINDA açılır.
   *
   * Kimliği DEĞİL nesneyi tutmak yanlış olurdu: görev silinince ya da
   * başka bir sekmede değişince elde bayat bir kopya kalırdı. Kimlik
   * tutulup nesne her render'da önbellekten okunur.
   *
   * Rect kimliğin YANINDA duruyor çünkü panelin çapası o: rect'i
   * bloktan her render'da yeniden okumak, blok kaydırılıp yer
   * değiştirdiğinde paneli de oynatırdı. Tıklama ANINDAKİ konum
   * dondurulur.
   */
  const [openTask, setOpenTask] = useState<{
    id: string;
    rect: DOMRect;
  } | null>(null);

  const routinesQuery = useRoutines();
  const entriesQuery = useEntries(today, today);
  const tasksQuery = useTasks();

  const entries = entriesQuery.data ?? EMPTY_ENTRIES;
  const setEntry = useSetEntry(toast.show);

  const toggleTask = useToggleTask(toast.show);
  const createTask = useCreateTask(toast.show);
  const deleteTask = useDeleteTask(toast.show);
  const rescheduleTask = useRescheduleTask(toast.show);
  const setTaskTime = useSetTaskTime(toast.show);
  const renameTask = useRenameTask(toast.show);

  /**
   * Bugün gösterilecek rutinler.
   *
   * Zorunlu olanlar + esnek olanlar (herhangi bir gün yapılabilir) +
   * bugün zaten işaretlenmiş olanlar. Sonuncusu önemli: zorunlu
   * olmayan bir günde bir şey yaptıysan listeden kaybolmamalı.
   */
  const routines = useMemo(() => {
    const all = routinesQuery.data ?? [];
    return all.filter((r) => {
      if (!isActiveOn(r, today)) return false;
      if (isDueOn(r, today)) return true;
      if (valueOn(entries, r, today) > 0) return true;
      return periodProgress(entries, r, today) !== null;
    });
  }, [routinesQuery.data, entries, today]);

  const score = useMemo(
    () => dayScore(entries, routinesQuery.data ?? [], today),
    [entries, routinesQuery.data, today],
  );

  /*
   * Izgaraya YALNIZCA görünen günlere tarihlenen görevler girer.
   *
   * `tasksForDay` geçmişten taşan tamamlanmamışları da bugüne çeker ve
   * listede doğru olan davranış odur — ama çizelgede taşan bir görevin
   * saati BAŞKA bir günün saatidir; onu bugünün 09:00'ına çizmek yalan
   * olurdu. Taşanlar aşağıdaki "taşınanlar" bölümünde duruyor.
   */
  const gridTasks = useMemo(() => {
    const visible = new Set(surface.dates);
    return (tasksQuery.data ?? []).filter(
      (t) => t.dueDate !== null && visible.has(t.dueDate),
    );
  }, [tasksQuery.data, surface.dates]);

  /** Vadesi geçmiş, hâlâ açık işler — ızgaranın altında ayrı bölüm. */
  const overdue = useMemo(
    () =>
      (tasksQuery.data ?? []).filter(
        (t) => t.dueDate !== null && !t.done && t.dueDate < today,
      ),
    [tasksQuery.data, today],
  );

  const someday = useMemo(
    () => undatedTasks(tasksQuery.data ?? []),
    [tasksQuery.data],
  );

  const categoriesQuery = useCategories();
  const categoryById = useMemo(
    () => categoryMap(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  /** Kategori kimliğinden renge — `taskColorSlot`'un devralma yolu. */
  const categoryColorOf = useCallback(
    (categoryId: string) => categoryById.get(categoryId)?.colorSlot,
    [categoryById],
  );

  const colorOf = useCallback(
    (task: Task) => taskColorSlot(task, categoryColorOf),
    [categoryColorOf],
  );

  /* Nesne her render'da önbellekten TAZE okunur — bkz. openTask. */
  const openedTask = useMemo(
    () =>
      openTask === null
        ? null
        : ((tasksQuery.data ?? []).find((t) => t.id === openTask.id) ?? null),
    [openTask, tasksQuery.data],
  );

  const handleOpen = useCallback((task: Task, anchor: DOMRect) => {
    // Aynı bloğa ikinci kez basmak paneli kapatır.
    setOpenTask((current) =>
      current?.id === task.id ? null : { id: task.id, rect: anchor },
    );
  }, []);

  const closePopover = useCallback(() => setOpenTask(null), []);

  const popoverActions = useTaskPopoverActions(today, toast.show);

  /* Dağıtım Planlama ızgarasıyla PAYLAŞILIYOR — bkz. useDropDispatch. */
  const handleDrop = useDropDispatch(toast.show);

  /*
   * Liste satırlarının yazma eylemleri.
   *
   * `useTaskPopoverActions` DEĞİL: o panelin kümesi (renk, hedef, not)
   * ve `TaskItem` bunların hiçbirini göstermiyor. Buradaki beş eylem,
   * aşağıdaki "Taşınanlar" bölümünün satırlarıyla BİREBİR aynı —
   * ekranın iki yerinde aynı satır aynı şeyi yapmalı.
   */
  const listActions = useMemo<DayListActions>(
    () => ({
      onToggle: (task) => toggleTask.mutate({ id: task.id, done: !task.done }),
      onDelete: (task) => deleteTask.mutate(task.id),
      onDefer: (task) => rescheduleTask.mutate({ id: task.id, dueDate: today }),
      onRename: (task, title) => renameTask.mutate({ id: task.id, title }),
      onSetTime: (task, startTime, durationMinutes) =>
        setTaskTime.mutate({ id: task.id, startTime, durationMinutes }),
    }),
    [toggleTask, deleteTask, rescheduleTask, renameTask, setTaskTime, today],
  );

  const handleCreateInSlot = useCallback(
    (title: string, slot: DraftSlot) => {
      createTask.mutate({
        title,
        dueDate: slot.date,
        note: null,
        startTime: formatTime(slot.startMinute),
        durationMinutes: 30,
      });
    },
    [createTask],
  );

  const doneCount = routines.filter((r) => isCompleted(entries, r, today)).length;

  function handleToggle(routine: RoutineWithSchedule) {
    setEntry.mutate({
      routineId: routine.id,
      date: today,
      value: isCompleted(entries, routine, today) ? 0 : routine.target,
    });
  }

  function handleStep(routine: RoutineWithSchedule, delta: number) {
    const next = Math.max(0, valueOn(entries, routine, today) + delta);
    setEntry.mutate({ routineId: routine.id, date: today, value: next });
  }

  const isLoading = routinesQuery.isPending;

  /*
   * Ray yalnızca GÜN ölçeğinde. Hafta ölçeğinde ızgara zaten yedi
   * sütun çiziyor ve yanına bir sütun daha koymak, asıl işi ekranın
   * üçte birine sıkıştırırdı. Ayrıca "günün planı" ve "gün özeti"
   * tek bir güne ait; yedi günü kapsayan bir görünümde hangi günün
   * planını gösterdikleri belirsiz olurdu.
   */
  const showRail = surface.scale === "day";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TodayHeader
        label={gridRangeLabel(surface.scale, surface.dates, formatLongDate)}
        weekday={
          surface.scale === "day" ? WEEKDAYS_LONG[isoWeekday(surface.anchor)] : null
        }
        doneCount={doneCount}
        totalCount={routines.length}
        ratio={score.ratio}
        hasWork={score.possible > 0}
        nav={
          <DayGridHeader
            scale={surface.scale}
            isCurrent={surface.isCurrent}
            onScale={surface.setScale}
            onStep={surface.step}
            onToday={surface.goToday}
            viewMode={view.mode}
            onViewMode={view.setMode}
          />
        }
      />

      <ScreenBody width={surface.scale === "week" || showRail ? "6xl" : "2xl"}>
        {isLoading ? (
          <TodaySkeleton />
        ) : (
          <div
            className={cn(
              "flex min-w-0 flex-col gap-[var(--stack-gap)]",
              /*
               * Ray SOLDA değil sağda duruyor. Günün asıl işi
               * (rutinler + ızgara) okuma yönünde önce gelmeli;
               * plan ve özet ona eşlik eden bağlamdır. Mobilde
               * `flex-col` sırası zaten bunu veriyor — ray altta
               * kalır ve `order` ile numara yapmaya gerek kalmaz.
               */
              showRail && "md:flex-row md:items-start",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[var(--stack-gap)]">
            <section>
              {routines.length === 0 ? (
                <EmptyState
                  icon={<CheckIcon size={22} />}
                  title="Bugün için rutin yok"
                  description="Bugüne denk gelen bir rutinin yok. Yeni bir tane ekleyebilir ya da tablodan geçmiş günleri doldurabilirsin."
                  actionLabel="Rutin ekle"
                  actionHref="/rutinler"
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {routines.map((routine) => (
                    <TodayRoutineItem
                      key={routine.id}
                      routine={routine}
                      date={today}
                      value={valueOn(entries, routine, today)}
                      completed={isCompleted(entries, routine, today)}
                      progress={periodProgress(entries, routine, today)}
                      onToggle={() => handleToggle(routine)}
                      onStep={(delta) => handleStep(routine, delta)}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section>
              <SectionHeading sectionKey="today.tasks" onError={toast.show} />

              <div className="mb-2.5">
                {view.mode === "grid" ? (
                  <DayGridScreen
                    dates={surface.dates}
                    today={today}
                    tasks={gridTasks}
                    colorOf={colorOf}
                    onOpen={handleOpen}
                    onCreate={handleCreateInSlot}
                    onDrop={handleDrop}
                  />
                ) : (
                  <DayListScreen
                    dates={surface.dates}
                    today={today}
                    tasks={gridTasks}
                    colorOf={colorOf}
                    actions={listActions}
                  />
                )}
              </div>

              {/* Izgarada seçilen görevin düzenleme paneli.
                  Bloğun YANINDA açılır (portal + fixed): eskiden burada,
                  ızgaranın altında bir `TaskItem` satırı vardı ve
                  kullanıcı gözünü tıkladığı yerden aşağı indirmek
                  zorundaydı — hangi bloğu düzenlediği de görünmüyordu.

                  Liste modunda HİÇ çizilmez. İki gerekçe: satırın kendi
                  kontrolleri panelin işini zaten görüyor (bkz.
                  DayListScreen) ve panel açıkken moda geçilirse çapa
                  aldığı blok DOM'dan silinmiş olur — panel boş bir
                  noktada asılı kalırdı. */}
              {view.mode === "grid" && openedTask && openTask && (
                <TaskPopover
                  task={openedTask}
                  anchorRect={openTask.rect}
                  inheritedColor={
                    openedTask.categoryId
                      ? (categoryColorOf(openedTask.categoryId) ?? null)
                      : null
                  }
                  actions={popoverActions}
                  onClose={closePopover}
                />
              )}

              <TaskQuickAdd
                dueDate={today}
                pending={createTask.isPending}
                onAdd={(title) =>
                  createTask.mutate({ title, dueDate: today, note: null })
                }
              />
            </section>

            {/* Vadesi geçmiş açık işler.
                Izgarada DEĞİL, çünkü saatleri başka bir güne ait ve
                onları bugünün saatlerine çizmek yalan olurdu. Ama
                sessizce kaybolmaları da olmaz: uygulamanın güvenilir
                olması, verilen sözün görünür kalmasına bağlı. */}
            {overdue.length > 0 && (
              <section>
                <h2 className="mb-1.5 text-[length:var(--text-sm)] text-[var(--color-warn)]">
                  Taşınanlar
                </h2>
                <ul className="flex flex-col gap-1.5">
                  {overdue.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      today={today}
                      onToggle={() =>
                        toggleTask.mutate({ id: task.id, done: !task.done })
                      }
                      onDelete={() => deleteTask.mutate(task.id)}
                      onDefer={() =>
                        rescheduleTask.mutate({ id: task.id, dueDate: today })
                      }
                      onSetTime={(startTime, durationMinutes) =>
                        setTaskTime.mutate({ id: task.id, startTime, durationMinutes })
                      }
                      onRename={(title) =>
                        renameTask.mutate({ id: task.id, title })
                      }
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* Tarihsiz görevler ("bir ara yapılacak"). Katlanabilir:
                günlük akışın parçası değil, ama girildikleri yerde
                görünmezlerse kaybolmuş sayılırlar.

                `<details>` DEĞİL, durum tabanlı açılır bölüm: başlık
                artık yeniden adlandırılabilir ve `<summary>` içinde
                tıkla-düzenle ile tıkla-aç/kapa aynı hedefte çakışırdı.
                Aç/kapa kendi düğmesine taşındı. */}
            {someday.length > 0 && (
              <section>
                <SectionHeading
                  sectionKey="today.someday"
                  onError={toast.show}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setSomedayOpen((open) => !open)}
                      aria-expanded={somedayOpen}
                      className="flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-ink-2)]"
                    >
                      <span className="tabular">
                        {someday.filter((t) => !t.done).length}
                      </span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden
                        className={cn(
                          "transition-transform duration-[var(--duration-fast)]",
                          somedayOpen && "rotate-90",
                        )}
                      >
                        <path
                          d="M4.5 2.5L8 6l-3.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="sr-only">
                        {somedayOpen ? "Bölümü kapat" : "Bölümü aç"}
                      </span>
                    </button>
                  }
                />

                {somedayOpen && (
                  <ul className="flex flex-col gap-1.5">
                    {someday.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        today={today}
                        onToggle={() =>
                          toggleTask.mutate({ id: task.id, done: !task.done })
                        }
                        onDelete={() => deleteTask.mutate(task.id)}
                        onDefer={() =>
                          rescheduleTask.mutate({ id: task.id, dueDate: today })
                        }
                        onRename={(title) =>
                          renameTask.mutate({ id: task.id, title })
                        }
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* Gün notu ARTIK BURADA DEĞİL — rayın "Gün özeti"
                bloğuna taşındı. Günü kapatan hareket (ne oldu +
                nasıl geçti) tek yerde duruyor. */}
            </div>

            {/* Hafta ölçeğinde ray `compact`: hedefler düşer, plan ve
                gün notu ızgaranın altında kalır. Rayı tamamen
                gizlemek, hafta görünümüne geçen kullanıcının o günün
                notunu yazamaz duruma düşmesi demekti. */}
            <DayRail
              today={today}
              entries={entries}
              routines={routinesQuery.data ?? []}
              tasks={tasksQuery.data ?? []}
              onError={toast.show}
              compact={!showRail}
            />
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
 * Bugün ekranının başlığı: tarih + ilerleme + ızgara gezinmesi.
 *
 * Gezinme kontrolleri AYRI bir şeride konmadı: iki yapışkan başlık
 * mobilde ekranın üçte birini yer ve `--header-h` yalnızca birini
 * ölçebilir — altındaki yapışkan elemanlar (saatsiz şerit) yanlış yere
 * tutunurdu.
 */
function TodayHeader({
  label,
  weekday,
  doneCount,
  totalCount,
  ratio,
  hasWork,
  nav,
}: {
  label: string;
  /** Yalnızca gün ölçeğinde; hafta aralığında gün adı anlamsız. */
  weekday: string | null;
  doneCount: number;
  totalCount: number;
  ratio: number;
  hasWork: boolean;
  nav: ReactNode;
}) {
  return (
    <header className="border-b border-[var(--color-line)] px-4 py-4 md:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-2">
          <h1 className="text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
            {label}
          </h1>
          {weekday && (
            <span className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              {weekday}
            </span>
          )}
          <div className="ml-auto">{nav}</div>
        </div>

        {hasWork && (
          <div className="mt-2.5 flex items-center gap-3">
            {/* İlerleme çubuğu: sayı kesin okumayı, çubuk hızlı
                taramayı sağlar. Renk tek başına bilgi taşımaz. */}
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
              role="progressbar"
              aria-valuenow={Math.round(ratio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Günün tamamlanma oranı"
            >
              {/*
                  Gün tamamlandığında renk `good`'a geçer ve çubuk IŞIR.

                  Buradaki eski karar "durum bildirimi — kutlama değil"
                  idi ve o zaman doğruydu: ürün bir kayıt aracıydı.
                  Koçluk ürününde günü bitirmek bildirilecek bir durum
                  değil, kutlanacak bir şeydir. Karar bilerek devrildi.

                  Kutlama yine de KIT ve VERİYE DAYALI: ışıma yalnızca
                  %100'de çıkar, yüzde zaten yanında yazıyor ve renk tek
                  başına bilgi taşımıyor. "Harikasın!" yazmıyoruz —
                  sayıyı gösterip ışıtıyoruz.
              */}
              <div
                className={cn(
                  "h-full rounded-full",
                  "transition-[width,background-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
                  ratio >= 1
                    ? "bg-[var(--color-good)] shadow-[0_0_12px_-2px_oklch(0.72_0.17_148/0.6)]"
                    : "bg-[var(--color-accent)] shadow-[var(--glow-accent-sm)]",
                )}
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>

            <span
              className={cn(
                "tabular shrink-0 text-[length:var(--text-sm)]",
                "transition-colors duration-[var(--duration-base)]",
                ratio >= 1
                  ? "font-medium text-[var(--color-ink)]"
                  : "text-[var(--color-ink-2)]",
              )}
            >
              {doneCount}/{totalCount} · {formatPercent(ratio)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl bg-[var(--color-surface-2)]"
          style={{ animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * Sorgu parametreleri çözülene kadar gösterilen iskelet.
 *
 * `TodaySkeleton`'dan farkı başlık şeridini de çizmesi: bu, ölçek ve
 * çapa URL'den okunmadan ÖNCE kullanılıyor (Suspense fallback'i) ve o
 * an hangi günün gösterileceği bilinmiyor. `PlanBoot` ile aynı ayrım,
 * aynı gerekçe.
 */
export function TodayBoot() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[var(--color-line)] px-4 py-4 md:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <span
            className="block h-7 w-48 animate-pulse rounded-md bg-[var(--color-surface-2)]"
            aria-hidden
          />
        </div>
      </header>

      <ScreenBody width="2xl">
        <TodaySkeleton />
      </ScreenBody>
    </div>
  );
}
