"use client";

import { toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatShortDate, formatWeekRange, WEEKDAYS_MIN } from "@/lib/ui/tr";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import type { Task } from "@/features/tasks/types";
import type { DaySummary } from "./dayplan";
import { PlanTaskList } from "./PlanTaskList";
import { chunkWeeks, type PlanBucket } from "./range";
import type { Category } from "./types";
import "./planlama.css";

interface PlanMonthGridProps {
  buckets: readonly PlanBucket[];
  today: DateStr;
  /**
   * Gün başına özet — kutudaki plan noktası.
   *
   * Kova sayaçlarıyla ÇAKIŞMAZ; `daySummaries` onları aynen taşır ve
   * üstüne yalnızca `hasPlan`'ı ekler (bkz. dayplan.ts).
   */
  summaries: ReadonlyMap<DateStr, DaySummary>;
  /** Kimlikten kategoriye — satırdaki renk noktası için. */
  categoryById: ReadonlyMap<string, Category>;
  /** Havuzdan seçili görev varsa günler yerleştirme hedefi olur. */
  placing: boolean;
  addPending: boolean;
  onPlace: (date: DateStr) => void;
  /** Gün panelini açar — plan metni, kategori ve hedef seçicileri orada. */
  onOpenDay: (date: DateStr) => void;
  onAdd: (title: string, date: DateStr) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRename: (task: Task, title: string) => void;
  onSetTime: (
    task: Task,
    startTime: string | null,
    durationMinutes: number | null,
  ) => void;
  onUnschedule: (task: Task) => void;
  onReorder: (dayTasks: readonly Task[], task: Task, delta: -1 | 1) => void;
}

/**
 * Ay ölçeğinin ızgarası — hafta satırları.
 *
 * ── Neden artık görev BAŞLIKLARI var? ──
 * Önceki sürüm kare hücreler çiziyordu ve gerekçesi "42 kare hücreye
 * görev satırı sığmaz" idi. Doğruydu, ama hücrelerin kare ve hepsinin
 * tek ekranda olmasını varsayıyordu. Ay dikey olarak kaydırılınca bu
 * varsayım düşer: haftaya bir satır ayrılınca kutuya 20rem verilebilir
 * ve "hangileri" sorusu paneli açmadan cevaplanır.
 *
 * ── Açık iş sayısı neden hâlâ başlıkta? ──
 * Kutu artık kaydırılabilir, yani görünen satırlar günün tamamı
 * olmayabilir. Başlıktaki sayı "8" derken dört satır görünüyorsa fark
 * kullanıcıya aşağıda daha çok iş olduğunu söyler — kaydırma çubuğunun
 * tek başına veremediği ipucu.
 *
 * ── Gün paneli neden DURUYOR? ──
 * Kutu satırları düzenletir ama günün plan METNİ (`DayPlanEditor`),
 * kategori ve hedef seçicileri yalnızca panelde. Plan noktası da
 * panelin yazdığı şeyi işaret ediyor; paneli kaldırmak o noktanın
 * gösterdiği yere gitmenin yolunu kapatırdı.
 *
 * Takvim ekranının ızgarasından AYRI: orada hücre rutin yoğunluğunu
 * gösteriyor, burada gün kurulur.
 */
export function PlanMonthGrid({
  buckets,
  today,
  summaries,
  categoryById,
  placing,
  addPending,
  onPlace,
  onOpenDay,
  onAdd,
  onToggle,
  onDelete,
  onRename,
  onSetTime,
  onUnschedule,
  onReorder,
}: PlanMonthGridProps) {
  const weeks = chunkWeeks(buckets);

  return (
    <div className="planMonthWeeks">
      {/* Gün adları YALNIZCA masaüstünde: mobilde kutular alt alta
          dizilir ve her kutu kendi gününü zaten yazar. */}
      <div className="hidden md:block">
        <div className="planMonthWeek" aria-hidden>
          {WEEKDAYS_MIN.slice(1).map((day) => (
            <div
              key={day}
              className="py-1 text-center text-[length:var(--text-2xs)] text-[var(--color-ink-3)]"
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {weeks.map((week) => {
        const first = week[0];
        const last = week[week.length - 1];
        if (!first || !last) return null;

        const label = formatWeekRange(first.date, last.date);

        return (
          /* Etiket `aria-label` DEĞİL başlıktan gelir: ikisini birden
             vermek aynı metni iki kez okuturdu. */
          <section key={first.date} aria-labelledby={`hafta-${first.date}`}>
            <h2 id={`hafta-${first.date}`} className="planMonthWeekLabel">
              {label}
            </h2>

            <div className="planMonthWeek">
              {week.map((bucket) => (
                <PlanMonthDay
                  key={bucket.date}
                  bucket={bucket}
                  today={today}
                  hasPlan={summaries.get(bucket.date)?.hasPlan ?? false}
                  categoryById={categoryById}
                  placing={placing}
                  addPending={addPending}
                  onPlace={onPlace}
                  onOpenDay={onOpenDay}
                  onAdd={onAdd}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onRename={onRename}
                  onSetTime={onSetTime}
                  onUnschedule={onUnschedule}
                  onReorder={onReorder}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PlanMonthDay({
  bucket,
  today,
  hasPlan,
  categoryById,
  placing,
  addPending,
  onPlace,
  onOpenDay,
  onAdd,
  onToggle,
  onDelete,
  onRename,
  onSetTime,
  onUnschedule,
  onReorder,
}: {
  bucket: PlanBucket;
  today: DateStr;
  hasPlan: boolean;
  categoryById: ReadonlyMap<string, Category>;
  placing: boolean;
  addPending: boolean;
  onPlace: (date: DateStr) => void;
  onOpenDay: (date: DateStr) => void;
  onAdd: (title: string, date: DateStr) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRename: (task: Task, title: string) => void;
  onSetTime: (
    task: Task,
    startTime: string | null,
    durationMinutes: number | null,
  ) => void;
  onUnschedule: (task: Task) => void;
  onReorder: (dayTasks: readonly Task[], task: Task, delta: -1 | 1) => void;
}) {
  const day = toParts(bucket.date).day;
  const isToday = bucket.date === today;
  // Yıl DEĞİL "5 Ağustos": ay ekranında yıl zaten başlıkta ve etiketi
  // her kutuda tekrarlamak ekran okuyucuyu boğardı.
  const dayName = formatShortDate(bucket.date);

  /*
   * Etiket sayıyı KELİMEYLE söyler: rakamlar yan yana okunduğunda
   * hangisinin gün, hangisinin iş sayısı olduğu belli olmazdı.
   *
   * "planlı" da etikete girer — nokta `aria-hidden` ve renk tek başına
   * bilgi taşımamalı.
   */
  const openLabel = [
    `${dayName}: günü aç`,
    bucket.openCount > 0 ? `${bucket.openCount} iş` : "iş yok",
    hasPlan ? "planlı" : null,
    isToday ? "bugün" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section
      aria-label={dayName}
      className={cn(
        "planMonthDay",
        !bucket.inScope && "planMonthDayOutside",
        isToday && "planMonthDayToday",
        bucket.inScope && bucket.date < today && "planMonthDayPast",
        placing && "planMonthDayTarget",
      )}
    >
      {/*
        Gün numarası bir DÜĞME: paneli açar. Kutunun tamamı tıklanabilir
        yapılamaz — içinde checkbox, metin girdisi ve simge düğmeleri
        var; hepsini saran bir hedef onları yutar, iç içe interaktif
        eleman hem geçersiz HTML hem klavye erişilemez olurdu.
      */}
      <header className="flex shrink-0 items-baseline gap-1.5">
        <button
          type="button"
          aria-label={openLabel}
          onClick={() => onOpenDay(bucket.date)}
          className={cn(
            "-mx-1 flex items-center gap-1.5 rounded-md px-1 py-0.5",
            "transition-colors duration-[var(--duration-fast)]",
            "hover:bg-[var(--color-surface-3)]",
          )}
        >
          <span
            className={cn(
              "tabular text-[length:var(--text-sm)]",
              isToday
                ? "font-medium text-[var(--color-accent)]"
                : "text-[var(--color-ink-2)]",
            )}
          >
            {day}
          </span>

          {/* Plan noktası sayaçtan AYRI bir işaret: planı yazılmış ama
              işi olmayan bir gün de "dolu"dur ve bunu sayı gösteremezdi
              (bkz. dayplan.ts). */}
          {hasPlan && (
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-[var(--color-accent)]"
            />
          )}
        </button>

        {/* Sıfırken hiç gösterilmez: "0" bilgi değil gürültüdür ve ayda
            42 kez tekrarlanırdı. */}
        {bucket.openCount > 0 && (
          <span
            aria-hidden
            className="tabular ml-auto text-[length:var(--text-xs)] text-[var(--color-ink-3)]"
          >
            {bucket.openCount}
          </span>
        )}
      </header>

      {/* Yerleştirme hedefi AYRI bir düğmedir (yukarıdaki gerekçe).
          Görsel etiket kısa — ~150px'te "5 Ağustos gününe koy" üç
          satıra sarardı; tam hâli `aria-label`'da. */}
      {placing && (
        <button
          type="button"
          aria-label={`${dayName} gününe koy`}
          onClick={() => onPlace(bucket.date)}
          className={cn(
            "shrink-0 rounded-lg border border-dashed border-[var(--color-accent)] px-2 py-1.5",
            "text-[length:var(--text-xs)] text-[var(--color-accent)]",
            "transition-colors duration-[var(--duration-fast)]",
            "hover:bg-[color-mix(in_oklch,var(--color-accent)_12%,transparent)]",
          )}
        >
          <span aria-hidden>{day}&apos;e koy</span>
        </button>
      )}

      <PlanTaskList
        tasks={bucket.tasks}
        today={today}
        categoryById={categoryById}
        className="planMonthDayTasks flex flex-col gap-1.5"
        onToggle={onToggle}
        onDelete={onDelete}
        onRename={onRename}
        onSetTime={onSetTime}
        onUnschedule={onUnschedule}
        onReorder={onReorder}
      />

      {/* `shrink-0`: liste `flex: 1` ile büyürken ekleme kutusu
          sıkışmamalı — kutunun boyu sabit, sıkışan kutu 20rem'de
          okunmaz bir şerit olurdu. `mt-auto` boş günde işe yarar:
          liste hiç render edilmediğinde kutuyu yine alta iter. */}
      <div className="mt-auto shrink-0">
        <TaskQuickAdd
          dueDate={bucket.date}
          pending={addPending}
          onAdd={(title) => onAdd(title, bucket.date)}
        />
      </div>
    </section>
  );
}
