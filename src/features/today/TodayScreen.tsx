"use client";
import { ScreenBody } from "@/components/Screen";

import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { formatLongDate, formatPercent, WEEKDAYS_LONG } from "@/lib/ui/tr";
import { isoWeekday, startOfMonth, todayStr } from "@/lib/date/date";
import { EmptyState } from "@/components/EmptyState";
import { CheckIcon } from "@/components/icons";
import { Toast, useToast } from "@/components/Toast";
import { isCompleted, valueOn } from "@/features/entries/completion";
import { useSetEntry } from "@/features/entries/mutations";
import { TekrarKuyrugu } from "@/features/deneme/TekrarKuyrugu";
import { EMPTY_ENTRIES, useEntries } from "@/features/entries/queries";
import { isActiveOn, isDueOn } from "@/features/routines/schedule";
import { useRoutines } from "@/features/routines/queries";
import type { RoutineWithSchedule } from "@/features/routines/types";
import { dayScore, periodProgress } from "@/features/stats/score";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { CategoryDot } from "@/features/planlama/CategoryDot";
import { usePlanGoals } from "@/features/planlama/queries";
import { TaskDetails } from "@/features/tasks/TaskDetails";
import { TaskItem } from "@/features/tasks/TaskItem";
import { DayLoad } from "@/features/tasks/DayLoad";
import { useTodayFocusSeconds } from "@/features/zen/sessions";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import { orderForDay } from "@/features/tasks/dayorder";
import { useCategories, categoryMap } from "@/features/planlama/queries";
import { useSetTaskGoal } from "@/features/planlama/mutations";
import {
  useCreateTask,
  useDeleteTask,
  useRenameTask,
  useRescheduleTask,
  useSetTaskColor,
  useSetTaskEstimate,
  useSetTaskNote,
  useToggleTask,
} from "@/features/tasks/mutations";
import { tasksForDay, undatedTasks, useTasks } from "@/features/tasks/queries";
import type { Task } from "@/features/tasks/types";
import { DayRail } from "./DayRail";
import { EveningSheet } from "./EveningSheet";
import { FocusCard } from "./FocusCard";
import { isEvening } from "./evening";
import { buildDayClose } from "./daysummary";
import { nextTask, openCount } from "./focus";
import { TodayRoutineItem } from "./TodayRoutineItem";

export function TodayScreen() {
  /*
   * Gün URL'den DEĞİL, saatten okunuyor.
   *
   * Ekranın adı "Bugün" ve artık tek bir günü gösteriyor: ölçek
   * anahtarı (`?ol=`) ve çapa (`?g=`) saat ızgarasıyla birlikte kalktı.
   * İleriye bakmak Plan sekmesinin işi — iki ekranın da "hangi güne
   * bakıyorum" sorusunu sorması, tam olarak sadeleştirmenin kaldırdığı
   * karışıklıktı.
   */
  const today = todayStr();
  const toast = useToast();

  /*
   * "Bir ara" varsayılan olarak KAPALI: günlük akışın parçası değil ve
   * açık gelirse tarihli işlerin altında uzun bir kuyruk bırakır.
   */
  const [somedayOpen, setSomedayOpen] = useState(false);

  /**
   * Hedef paneli açık olan satırın kimliği.
   *
   * Nesne DEĞİL kimlik tutuluyor: görev silinince ya da başka bir
   * sekmede değişince elde bayat bir kopya kalırdı.
   *
   * Eskiden bu iş `TaskPopover`'ındı: ızgaradaki bloğun yanında yüzen,
   * kendi konumlandırma matematiği (`anchor.ts`, dört kenar denemesi)
   * olan bir panel. Bloklar gidince çapalanacak bir şey de kalmadı;
   * panel satırın altına indi ve portal + `fixed` matematiği düştü.
   */
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const routinesQuery = useRoutines();
  const entriesQuery = useEntries(today, today);
  const tasksQuery = useTasks();

  const entries = entriesQuery.data ?? EMPTY_ENTRIES;
  const setEntry = useSetEntry(toast.show);

  const toggleTask = useToggleTask(toast.show);
  const createTask = useCreateTask(toast.show);
  const deleteTask = useDeleteTask(toast.show);
  const rescheduleTask = useRescheduleTask(toast.show);
  const renameTask = useRenameTask(toast.show);
  const setTaskGoal = useSetTaskGoal(toast.show);
  const setTaskColor = useSetTaskColor(toast.show);
  const setTaskEstimate = useSetTaskEstimate(toast.show);
  /*
   * Odak sayacının ölçtüğü GERÇEK süre — tahminlerin yanında durur.
   * Odak ekranıyla aynı sorgu anahtarı: orada biten bir tur, buraya
   * dönüldüğünde önbellekten güncel gelir.
   */
  const focusToday = useTodayFocusSeconds(today);
  const setTaskNote = useSetTaskNote(toast.show);

  /**
   * Bugün gösterilecek rutinler.
   *
   * Zorunlu olanlar + esnek olanlar (herhangi bir gün yapılabilir) +
   * bugün zaten işaretlenmiş olanlar. Sonuncusu önemli: zorunlu olmayan
   * bir günde bir şey yaptıysan listeden kaybolmamalı.
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
   * Günün TEK görev kümesi — taşınanlar DAHİL.
   *
   * Eskiden iki küme vardı: ızgara yalnızca bugüne tarihlenenleri
   * çiziyordu (taşan bir görevin saati BAŞKA bir güne aitti ve onu
   * bugünün 09:00'ına çizmek yalan olurdu), taşananlar ise altta ayrı
   * bir bölümde duruyordu. Ama `DayCloseCard` sayacı `tasksForDay`
   * okuyordu: ekranda görünen küme ile özetin saydığı küme sessizce
   * ayrışmıştı — `daysummary.ts` bu eşitliği bir kural olarak yazmasına
   * rağmen.
   *
   * Saatler düşünce ayrımın gerekçesi de düştü: taşan bir görevi listeye
   * karıştırmak artık hiçbir şey hakkında yalan söylemiyor, satır zaten
   * "şu tarihten taşındı" diye yazıyor (bkz. TaskItem).
   */
  const dayTasks = useMemo(
    () => orderForDay(tasksForDay(tasksQuery.data ?? [], today)),
    [tasksQuery.data, today],
  );

  const someday = useMemo(
    () => undatedTasks(tasksQuery.data ?? []),
    [tasksQuery.data],
  );

  /*
   * Odak kartının gösterdiği iş, listenin İLK açık işiyle aynı olmak
   * zorunda — `focus.test.ts` bunu bir invariant olarak sabitliyor.
   * Aynı `dayTasks` kümesinden türetilmesi bunu yapısal kılıyor.
   */
  const focus = useMemo(() => nextTask(dayTasks, today), [dayTasks, today]);
  const openLeft = useMemo(() => openCount(dayTasks), [dayTasks]);

  /*
   * Hedefler GÖREVİN kendi ayından okunuyor, görüntülenen aydan değil
   * — bir hedef aya aittir ve o ayın özetinde ölçülür (bkz.
   * TaskGoalRow). Bugün ekranında bu ikisi ayın son gününde ayrışır.
   */
  const focusGoalsQuery = usePlanGoals(
    startOfMonth(focus?.dueDate ?? today),
  );

  const focusGoal = useMemo(() => {
    if (focus?.goalId == null) return null;
    return (focusGoalsQuery.data ?? []).find((g) => g.id === focus.goalId) ?? null;
  }, [focus, focusGoalsQuery.data]);

  const categoriesQuery = useCategories();
  const categoryById = useMemo(
    () => categoryMap(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  /**
   * Görevin kategorisinden DEVRALACAĞI renk — bölmedeki önizleme için.
   *
   * `taskColorSlot` DEĞİL: o, görevin kendi rengi varsa onu döndürür ve
   * "kategori rengi" seçeneği kendi rengini önizlerdi. Burada sorulan
   * soru "rengini kaldırırsan ne olur".
   */
  const inheritedColorOf = useCallback(
    (task: Task) =>
      task.categoryId === null
        ? null
        : (categoryById.get(task.categoryId)?.colorSlot ?? null),
    [categoryById],
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

  /** Satırın hedef panelini açar/kapatır; ikinci tık kapatır. */
  const toggleOpen = useCallback((id: string) => {
    setOpenTaskId((current) => (current === id ? null : id));
  }, []);

  /*
   * Akşam daveti: saat eşiği `evening.ts`'te ve test edilebilir.
   * Saat BİR KEZ okunuyor (ilk render) — her render'da okumak, gece
   * 20:00'de sayfanın kendiliğinden değişmesini sağlardı ama
   * kullanıcının yazdığı bir notun ortasında da sheet açabilirdi.
   */
  const [hour] = useState(() => new Date().getHours());

  const [eveningOpen, setEveningOpen] = useState(false);

  const close = useMemo(
    () =>
      buildDayClose({
        entries,
        routines: routinesQuery.data ?? [],
        tasks: tasksQuery.data ?? [],
        today,
      }),
    [entries, routinesQuery.data, tasksQuery.data, today],
  );

  const unfinished = useMemo(() => dayTasks.filter((t) => !t.done), [dayTasks]);

  const isLoading = routinesQuery.isPending;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TodayHeader
        label={formatLongDate(today)}
        weekday={WEEKDAYS_LONG[isoWeekday(today)]}
        doneCount={doneCount}
        totalCount={routines.length}
        ratio={score.ratio}
        hasWork={score.possible > 0}
      />

      <ScreenBody width="6xl">
        {isLoading ? (
          <TodaySkeleton />
        ) : (
          <div
            className={cn(
              "flex min-w-0 flex-col gap-[var(--stack-gap)]",
              /*
               * Ray SOLDA değil sağda duruyor. Günün asıl işi (rutinler
               * + görevler) okuma yönünde önce gelmeli; plan ve özet ona
               * eşlik eden bağlamdır. Mobilde `flex-col` sırası zaten
               * bunu veriyor — ray altta kalır ve `order` ile numara
               * yapmaya gerek kalmaz.
               */
              "md:flex-row md:items-start",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[var(--stack-gap)]">
              {/* Odak kartı EN ÜSTTE: ekranı açan kişinin ilk gördüğü
                  şey "şimdi ne yapmalıyım"ın cevabı olmalı. Rutinler
                  ve liste onun altında, bağlam olarak duruyor. */}
              <FocusCard
                task={focus}
                goal={focusGoal}
                today={today}
                openCount={openLeft}
                onDone={() =>
                  focus && toggleTask.mutate({ id: focus.id, done: true })
                }
              />

              {/*
               * Tekrar kuyruğu odak kartının hemen ALTINDA: günün
               * asıl işinden sonra ama rutinlerden önce. Vadesi gelen
               * bir tekrar bugünün işidir ve aşağıda kalsaydı
               * kaydırılmadan görülmezdi. Hiç tekrar yoksa bileşen
               * kendini çizmiyor — boş bir kutu yer kaplamaz.
               */}
              <TekrarKuyrugu bugun={today} onError={toast.show} />

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
                <SectionHeading
                  sectionKey="today.tasks"
                  onError={toast.show}
                  trailing={
                    <DayLoad
                      tasks={dayTasks}
                      focusSeconds={focusToday.data}
                      className="ml-auto"
                    />
                  }
                />

                {dayTasks.length > 0 && (
                  <ul className="mb-2.5 flex flex-col gap-1.5">
                    {dayTasks.map((task) => {
                      const category =
                        task.categoryId === null
                          ? undefined
                          : categoryById.get(task.categoryId);

                      return (
                        <TaskItem
                          key={task.id}
                          task={task}
                          today={today}
                          marker={
                            category && (
                              <CategoryDot category={category} size={7} />
                            )
                          }
                          onToggle={() =>
                            toggleTask.mutate({ id: task.id, done: !task.done })
                          }
                          onSetEstimate={(estimateMinutes) =>
                            setTaskEstimate.mutate({ id: task.id, estimateMinutes })
                          }
                          onDelete={() => deleteTask.mutate(task.id)}
                          onDefer={() =>
                            rescheduleTask.mutate({ id: task.id, dueDate: today })
                          }
                          onRename={(title) =>
                            renameTask.mutate({ id: task.id, title })
                          }
                          /*
                           * Hedef bağı satırın KENDİ panelinde.
                           *
                           * `tasks.goal_id` şemada 0008'den beri var ama
                           * bir kez zaten kaybolmuştu: yalnızca
                           * Planlama'nın gün panelinden atanabildiği
                           * için, görevlerin çoğu Bugün'de doğduğundan
                           * aylık hedefler pratikte boş kalıyordu.
                           * Popover'la birlikte silinseydi aynı gerileme
                           * ikinci kez yaşanırdı.
                           */
                          expanded={openTaskId === task.id}
                          onExpand={() => toggleOpen(task.id)}
                          panel={
                            <TaskDetails
                              task={task}
                              inheritedColor={inheritedColorOf(task)}
                              onSetGoal={(goalId) =>
                                setTaskGoal.mutate({ id: task.id, goalId })
                              }
                              onSetColor={(colorSlot) =>
                                setTaskColor.mutate({ id: task.id, colorSlot })
                              }
                              onSetNote={(note) =>
                                setTaskNote.mutate({ id: task.id, note })
                              }
                            />
                          }
                        />
                      );
                    })}
                  </ul>
                )}

                <TaskQuickAdd
                  dueDate={today}
                  pending={createTask.isPending}
                  onAdd={(title) =>
                    createTask.mutate({ title, dueDate: today, note: null })
                  }
                />
              </section>

              {/* Tarihsiz görevler ("bir ara yapılacak"). Katlanabilir:
                  günlük akışın parçası değil, ama girildikleri yerde
                  görünmezlerse kaybolmuş sayılırlar.

                  `<details>` DEĞİL, durum tabanlı açılır bölüm: başlık
                  artık yeniden adlandırılabilir ve `<summary>` içinde
                  tıkla-düzenle ile tıkla-aç/kapa aynı hedefte
                  çakışırdı. Aç/kapa kendi düğmesine taşındı. */}
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
                          onSetEstimate={(estimateMinutes) =>
                            setTaskEstimate.mutate({ id: task.id, estimateMinutes })
                          }
                          onDelete={() => deleteTask.mutate(task.id)}
                          onRename={(title) =>
                            renameTask.mutate({ id: task.id, title })
                          }
                          expanded={openTaskId === task.id}
                          onExpand={() => toggleOpen(task.id)}
                          panel={
                            <TaskDetails
                              task={task}
                              inheritedColor={inheritedColorOf(task)}
                              onSetGoal={(goalId) =>
                                setTaskGoal.mutate({ id: task.id, goalId })
                              }
                              onSetColor={(colorSlot) =>
                                setTaskColor.mutate({ id: task.id, colorSlot })
                              }
                              onSetNote={(note) =>
                                setTaskNote.mutate({ id: task.id, note })
                              }
                            />
                          }
                        />
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {/*
                Akşam daveti listenin ALTINDA: günü kapatma teklifi,
                gün hâlâ önündeyken yukarıda durursa erken bir
                teslimiyet önerisi gibi okunur.
              */}
              {isEvening(hour) && (
                <section>
                  <button
                    type="button"
                    onClick={() => setEveningOpen(true)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3",
                      "border border-[var(--color-line)] bg-[var(--color-surface)]",
                      "text-left transition-colors duration-[var(--duration-fast)]",
                      "hover:border-[var(--color-accent)]",
                    )}
                  >
                    <span>
                      <span className="block text-[length:var(--text-sm)] font-medium">
                        Günü kapat
                      </span>
                      <span className="mt-0.5 block text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                        {unfinished.length > 0
                          ? `${unfinished.length} iş için karar ver: yarına, havuza ya da kalsın`
                          : "Bitmemiş iş kalmadı — günü olduğu gibi kapatabilirsin"}
                      </span>
                    </span>

                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden
                      className="shrink-0 text-[var(--color-ink-3)]"
                    >
                      <path
                        d="M4.5 2.5L8 6l-3.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </section>
              )}

              {/* Gün notu ARTIK BURADA DEĞİL — rayın "Gün özeti" bloğuna
                  taşındı. Günü kapatan hareket (ne oldu + nasıl geçti)
                  tek yerde duruyor. */}
            </div>

            <DayRail
              today={today}
              entries={entries}
              routines={routinesQuery.data ?? []}
              tasks={tasksQuery.data ?? []}
              onError={toast.show}
            />
          </div>
        )}
      </ScreenBody>

      {eveningOpen && (
        <EveningSheet
          tasks={unfinished}
          close={close}
          today={today}
          onClose={() => setEveningOpen(false)}
          onError={toast.show}
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

/**
 * Bugün ekranının başlığı: tarih + günün ilerlemesi.
 *
 * Gezinme kontrolleri YOK: ekran tek bir günü, bugünü gösteriyor.
 * Eskiden burada ölçek anahtarı (gün/hafta), ileri-geri okları ve
 * ızgara/liste anahtarı duruyordu; üçü de saat ızgarasıyla birlikte
 * kalktı ve ileriye bakmak Plan sekmesine geçti.
 */
function TodayHeader({
  label,
  weekday,
  doneCount,
  totalCount,
  ratio,
  hasWork,
}: {
  label: string;
  weekday: string;
  doneCount: number;
  totalCount: number;
  ratio: number;
  hasWork: boolean;
}) {
  return (
    <header className="border-b border-[var(--color-line)] px-4 py-4 md:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-2">
          <h1 className="text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
            {label}
          </h1>
          <span className="text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            {weekday}
          </span>
        </div>

        {hasWork && (
          <div className="mt-2.5 flex items-center gap-3">
            {/* İlerleme çubuğu: sayı kesin okumayı, çubuk hızlı taramayı
                sağlar. Renk tek başına bilgi taşımaz. */}
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
