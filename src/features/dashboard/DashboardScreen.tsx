"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/ui/cn";
import { addDays, startOfMonth, todayStr } from "@/lib/date/date";
import { formatLongDate, formatPercent, WEEKDAYS_MIN } from "@/lib/ui/tr";
import { ScreenBody } from "@/components/Screen";
import { Toast, useToast } from "@/components/Toast";
import { EMPTY_ENTRIES, useEntries } from "@/features/entries/queries";
import { useRoutines } from "@/features/routines/queries";
import { useTasks } from "@/features/tasks/queries";
import { usePlanGoals } from "@/features/planlama/queries";
import { goalProgress } from "@/features/planlama/rollup";
import { buildDayClose } from "@/features/today/daysummary";
import { weeklyTrend } from "@/features/stats/aggregate";
import { computeStreak, streakAtRisk } from "@/features/stats/streak";
import { trendDelta } from "@/features/stats/trend";
import {
  atRiskLine,
  dayLine,
  streakLine,
  trendLine,
  type CoachLine,
} from "@/features/coach/messages";
import { pickCoachLine } from "@/features/coach/pick";
import { SLOT_HEX } from "@/lib/ui/colors";
import { pendingRoutines, routineHeat, weekStrip } from "./summary";

/** Isı şeridinin uzunluğu. İki hafta, bir örüntü görmeye yeter. */
const HEAT_DAYS = 14;

/** Trend için geriye bakış: dört hafta, iki karşılaştırma noktası. */
const TREND_DAYS = 28;

/**
 * Kontrol paneli — açılış ekranı.
 *
 * ── Ne için var? ──
 * "Neyin nerede olduğu" tek ekranda görünsün diye. Uygulama yedi
 * sekmeye çıktığında en çok kaybolan şey buydu: kullanıcı hangi
 * ekranda ne olduğunu hatırlamak zorunda kalıyordu.
 *
 * ── Kart yığma YASAK ──
 * Beş bölüm beş özdeş kart olmaz — "cards are the lazy answer".
 * Hiyerarşi: koçluk satırı ve günün durumu büyük ve ışıklı, hafta
 * şeridi yatay, hedefler liste, rutin şeridi ince. İç içe kart yok.
 *
 * ── Yeni sorgu AÇILMAZ ──
 * Tüm veri mevcut sorgulardan türetiliyor ve React Query aynı
 * anahtarları başka ekranlarla paylaşıyor. Panel için ayrı bir tur
 * açmak aynı veriyi ikinci kez indirmek olurdu.
 */
export function DashboardScreen() {
  const today = todayStr();
  const toast = useToast();

  const routinesQuery = useRoutines();
  const tasksQuery = useTasks();
  /*
   * Girdi aralığı ısı şeridini DEĞİL trendi kapsıyor (28 > 14): tek
   * sorgu ikisini birden besliyor, iki ayrı aralık çekmek aynı
   * satırları iki kez indirmek olurdu.
   */
  const entriesQuery = useEntries(addDays(today, -(TREND_DAYS - 1)), today);
  const goalsQuery = usePlanGoals(startOfMonth(today));

  const entries = entriesQuery.data ?? EMPTY_ENTRIES;
  const routines = useMemo(() => routinesQuery.data ?? [], [routinesQuery.data]);
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const close = useMemo(
    () => buildDayClose({ entries, routines, tasks, today }),
    [entries, routines, tasks, today],
  );

  const strip = useMemo(() => weekStrip(tasks, today), [tasks, today]);

  const heat = useMemo(
    () => routineHeat(entries, routines, today, HEAT_DAYS),
    [entries, routines, today],
  );

  const pending = useMemo(
    () => pendingRoutines(entries, routines, today),
    [entries, routines, today],
  );

  const goals = useMemo(() => {
    const list = goalsQuery.data ?? [];
    return list.map((goal) => goalProgress(goal, tasks));
  }, [goalsQuery.data, tasks]);

  /**
   * Günün tek koçluk satırı.
   *
   * Elde aynı anda dört doğru cümle var; `pickCoachLine` en bilgi
   * değerlisini seçiyor. Dördünü birden göstermek panoyu bir bildirim
   * akışına çevirirdi — bir koç her şeyi aynı anda söylemez.
   */
  const coach = useMemo<CoachLine | null>(() => {
    const lines: Array<CoachLine | null> = [];

    /*
     * Risk altındaki İLK seri. Hepsini toplamak gereksiz: satır zaten
     * tek bir cümle gösterecek ve `pickCoachLine` aralarından yine
     * birini seçerdi.
     */
    for (const routine of routines) {
      if (!streakAtRisk(entries, routine, today)) continue;
      const streak = computeStreak(entries, routine, today);
      lines.push(atRiskLine(routine.name, streak.current));
      break;
    }

    /*
     * En uzun devam eden seri — kutlanacaksa o kutlanmalı. Rutin
     * başına ayrı satır üretmek, on rutinli bir kullanıcıda on
     * cümlelik bir liste demekti.
     */
    let best: ReturnType<typeof computeStreak> | null = null;
    for (const routine of routines) {
      const streak = computeStreak(entries, routine, today);
      if (best === null || streak.current > best.current) best = streak;
    }
    if (best !== null && best.current > 0) lines.push(streakLine(best));

    lines.push(
      trendLine(
        trendDelta(
          weeklyTrend(entries, routines, addDays(today, -(TREND_DAYS - 1)), today),
        ),
      ),
    );

    lines.push(dayLine(close));

    return pickCoachLine(lines);
  }, [entries, routines, today, close]);

  const isLoading = routinesQuery.isPending || tasksQuery.isPending;

  const doneTotal = close.routines.done + close.tasks.done;
  const total = close.routines.total + close.tasks.total;
  const ratio = total === 0 ? 0 : doneTotal / total;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[var(--color-line)] px-4 py-4 md:px-6">
        {/* Başlık gövdeyle AYNI genişlikte: ScreenBody 3xl kullanıyor
            ve burada 5xl vermek, tarihi içeriğin solunda asılı
            bırakırdı. */}
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
            {formatLongDate(today)}
          </h1>
        </div>
      </header>

      <ScreenBody width="3xl">
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <div className="flex flex-col gap-[var(--stack-gap)]">
            {coach && <CoachBanner line={coach} ratio={ratio} total={total} />}

            <WeekStrip strip={strip} />

            {goals.length > 0 && <GoalList goals={goals} />}

            <RoutineHeat heat={heat} pending={pending} />
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
 * Panelin en büyük öğesi: koçluk cümlesi + günün ilerlemesi.
 *
 * İkisi AYNI blokta çünkü aynı şeyi söylüyorlar: cümle yorum, çubuk
 * ölçü. Ayrı kartlara bölmek, kullanıcıyı sayıyı ve onun ne anlama
 * geldiğini iki yerde okumaya zorlardı.
 */
function CoachBanner({
  line,
  ratio,
  total,
}: {
  line: CoachLine;
  ratio: number;
  total: number;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-5 md:p-6",
        /*
         * Işıma YALNIZCA `good` tonunda. Glow bir ödüldür, ceza değil:
         * `warn` bilerek ışımaz ve uyarı rengini metinde taşır.
         */
        line.tone === "good"
          ? "border-[var(--color-accent)] bg-[var(--color-surface)] shadow-[var(--glow-accent-md)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)]",
      )}
    >
      <p
        className={cn(
          "text-[length:var(--text-2xl)] font-semibold tracking-[-0.02em]",
          line.tone === "warn" && "text-[var(--color-warn)]",
        )}
      >
        {line.headline}
      </p>

      {line.detail && (
        <p className="mt-1.5 text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
          {line.detail}
        </p>
      )}

      {/* İlerleme çubuğu yalnızca ÖLÇÜLECEK bir şey varken. Sıfır işlik
          bir günde "%0" çizmek, olmayan bir işi yapmamakla
          suçlamaktır. */}
      {total > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]"
            role="progressbar"
            aria-valuenow={Math.round(ratio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Bugünün tamamlanma oranı"
          >
            <div
              className={cn(
                "h-full rounded-full",
                "transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
                ratio >= 1
                  ? "bg-[var(--color-good)]"
                  : "bg-[var(--color-accent)] shadow-[var(--glow-accent-sm)]",
              )}
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>

          <span className="tabular shrink-0 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {formatPercent(ratio)}
          </span>
        </div>
      )}

      {line.action && (
        <Link
          href={line.action.href}
          className={cn(
            "mt-4 inline-flex h-9 items-center rounded-lg px-3.5",
            "text-[length:var(--text-sm)] font-medium",
            "bg-[var(--color-accent)] text-[var(--color-on-accent)]",
            "transition-shadow duration-[var(--duration-fast)]",
            "hover:shadow-[var(--glow-accent-md)]",
          )}
        >
          {line.action.label}
        </Link>
      )}
    </section>
  );
}

/**
 * Haftanın iş yoğunluğu — yedi sütunluk yatay şerit.
 *
 * Kart DEĞİL: panelin ikinci öğesi ve birinciyle aynı ağırlıkta
 * görünmemeli. Çerçevesiz, sadece başlık + şerit.
 */
function WeekStrip({
  strip,
}: {
  strip: ReturnType<typeof weekStrip>;
}) {
  /** Sütun yüksekliğinin ölçeği: haftanın en yoğun günü tam boy. */
  const peak = Math.max(1, ...strip.map((s) => s.total));

  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
          Bu hafta
        </h2>
        <Link
          href="/planlama"
          className="text-[length:var(--text-xs)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-accent)]"
        >
          Planlamaya git
        </Link>
      </div>

      <ul className="flex items-end gap-1.5">
        {strip.map((slot) => {
          const height = Math.round((slot.total / peak) * 100);

          return (
            <li key={slot.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex h-16 w-full items-end">
                {slot.total === 0 ? (
                  /* Boş gün ince bir taban çizgisi — sıfır yükseklikli
                     bir sütun "gün yok" gibi okunurdu. */
                  <div className="h-0.5 w-full rounded-full bg-[var(--color-line)]" />
                ) : (
                  <div
                    className="w-full overflow-hidden rounded-md bg-[var(--color-surface-3)]"
                    style={{ height: `${Math.max(height, 12)}%` }}
                    title={`${slot.done}/${slot.total} iş`}
                  >
                    {/* Dolu kısım ALTTAN yükselir: sütunun tabanı gün,
                        tepesi hedef. */}
                    <div
                      className={cn(
                        "w-full",
                        slot.isFuture
                          ? "bg-[var(--color-line-2)]"
                          : "bg-[var(--color-accent)]",
                      )}
                      style={{
                        height: `${Math.round((slot.done / slot.total) * 100)}%`,
                        marginTop: `${100 - Math.round((slot.done / slot.total) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <span
                className={cn(
                  "text-[length:var(--text-2xs)]",
                  slot.isToday
                    ? "font-semibold text-[var(--color-accent)]"
                    : "text-[var(--color-ink-3)]",
                )}
              >
                {WEEKDAYS_MIN[slot.weekday]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Ayın hedefleri — kompakt liste, kart değil. */
function GoalList({
  goals,
}: {
  goals: ReturnType<typeof goalProgress>[];
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
          Bu ayın hedefleri
        </h2>
        <Link
          href="/planlama/hedefler"
          className="text-[length:var(--text-xs)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-accent)]"
        >
          Hedeflere git
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {goals.map((progress) => (
          <li key={progress.goal.id} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: SLOT_HEX[progress.goal.colorSlot] }}
            />

            <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)]">
              {progress.goal.title}
            </span>

            {/*
              `null` oran ÖLÇÜLMÜYOR demek, sıfır değil: sayısal hedef
              verilmemiş ve bağlı görev de yok. "%0" yazmak "hiç
              başlamadın" der ve bu yanlış bir suçlama olurdu.
            */}
            {progress.ratio === null ? (
              <span className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-4)]">
                ölçülmüyor
              </span>
            ) : (
              <>
                <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)]"
                    style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                  />
                </div>
                <span className="tabular shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                  {formatPercent(progress.ratio)}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Son iki haftanın rutin doluluğu — en ince öğe, panelin dibinde. */
function RoutineHeat({
  heat,
  pending,
}: {
  heat: ReturnType<typeof routineHeat>;
  pending: number;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
          Rutin doluluğu
        </h2>
        <Link
          href="/tablo"
          className="text-[length:var(--text-xs)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-accent)]"
        >
          Tabloya git
        </Link>
      </div>

      <ul className="flex gap-1">
        {heat.map((slot) => (
          <li
            key={slot.date}
            title={
              slot.ratio === null
                ? `${slot.date}: zorunlu rutin yok`
                : `${slot.date}: ${formatPercent(slot.ratio)}`
            }
            className={cn(
              "h-6 min-w-0 flex-1 rounded-sm",
              /*
               * Ölçülmeyen gün ÇİZGİLİ değil sönük: "yapılmadı" ile
               * "yapılacak bir şey yoktu" farklı şeyler ve ikincisi
               * bir eksiklik gibi görünmemeli.
               */
              slot.ratio === null && "bg-[var(--color-surface-2)]",
            )}
            style={
              slot.ratio === null
                ? undefined
                : {
                    background: `color-mix(in oklch, var(--color-accent) ${Math.round(
                      Math.max(slot.ratio, 0.08) * 100,
                    )}%, var(--color-surface-2))`,
                  }
            }
          />
        ))}
      </ul>

      {pending > 0 && (
        <p className="mt-2 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          Bugün {pending} rutin işaretlenmeyi bekliyor.
        </p>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--stack-gap)]" aria-hidden>
      <div className="h-36 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
      <div className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-2)]" />
      <div className="h-20 animate-pulse rounded-xl bg-[var(--color-surface-2)]" />
    </div>
  );
}
