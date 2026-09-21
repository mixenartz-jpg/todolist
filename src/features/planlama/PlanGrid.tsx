"use client";

import { formatWeekRange } from "@/lib/ui/tr";
import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";
import { PlanDayRow } from "./PlanDayRow";
import { PlanSheet, PlanWeekSection } from "./PlanSheet";
import { chunkWeeks, type PlanBucket, type PlanScale } from "./range";
import type { Category } from "./types";
import type { DaySummary } from "./dayplan";
import "./planlama.css";

/*
 * Plan ızgarası — TEK bileşen, iki ölçek.
 *
 * ── Neden birleştirildi? ──
 * `PlanMonthGrid` ve `PlanWeekGrid` ayrı dosyalardı ve `PlanWeekGrid`
 * kendi yorumunda bunu itiraf ediyordu: "Yerleşim, ölçüler ve davranış
 * birebir aynı." Ama TAM olarak aynı değildi ve ayrıştıkları yerler
 * görünmezdi:
 *
 *   · `onOpenDay` haftada VERİLMİYORDU → tarih kanalı orada ölü bir
 *     bloktu. Kullanıcı ayda gün numarasına basınca panel açılıyor,
 *     haftada hiçbir şey olmuyordu ve hiçbir görsel ipucu bunu
 *     söylemiyordu.
 *   · `hasPlan` haftada hep `false` → plan noktası hiç çıkmıyordu.
 *   · `inScope` haftada hep `true` → solma yalnızca ayda vardı.
 *
 * Bunlar "iki ölçeğin farkı" değil, ikinci ekranın eksikleriydi.
 * Birleşince hepsi ikisinde de çalışır oldu.
 *
 * ── Ölçek ne DEĞİŞTİRİR? ──
 * Yalnızca BÖLÜMLEME: ay hafta başlıklarıyla 4-6 bölüme ayrılır,
 * hafta tek bölümdür ve başlık gereksizdir (ekran başlığı zaten o
 * haftayı yazıyor). Satırların kendisi, ölçüleri ve davranışı aynı.
 */

interface PlanGridProps {
  scale: PlanScale;
  buckets: readonly PlanBucket[];
  today: DateStr;
  /** Gün özetleri — plan noktası için. */
  summaries: ReadonlyMap<DateStr, DaySummary>;
  /** Kimlikten kategoriye — satırdaki renk noktası için. */
  categoryById: ReadonlyMap<string, Category>;
  /** Havuzdan seçili görev varsa günler yerleştirme hedefi olur. */
  placing: boolean;
  addPending: boolean;
  collapsedDays: ReadonlySet<DateStr>;
  onToggleCollapsed: (date: DateStr) => void;
  collapsedWeeks: ReadonlySet<DateStr>;
  onToggleWeek: (weekStart: DateStr) => void;
  /** Hafta başlangıcından o haftanın hedeflerine. */
  weekGoals: ReadonlyMap<DateStr, readonly { id: string; title: string; done: boolean }[]>;
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
}

export function PlanGrid({
  scale,
  buckets,
  today,
  summaries,
  categoryById,
  placing,
  addPending,
  collapsedDays,
  onToggleCollapsed,
  collapsedWeeks,
  onToggleWeek,
  weekGoals,
  onPlace,
  onOpenDay,
  onAdd,
  onToggle,
  onDelete,
  onRename,
  onSetTime,
  onUnschedule,
  onReorder,
}: PlanGridProps) {
  const rows = (week: readonly PlanBucket[]) =>
    week.map((bucket) => (
      <PlanDayRow
        key={bucket.date}
        bucket={bucket}
        today={today}
        hasPlan={summaries.get(bucket.date)?.hasPlan ?? false}
        categoryById={categoryById}
        placing={placing}
        addPending={addPending}
        inScope={bucket.inScope}
        collapsed={collapsedDays.has(bucket.date)}
        onToggleCollapsed={onToggleCollapsed}
        onOpenDay={onOpenDay}
        onPlace={onPlace}
        onAdd={onAdd}
        onToggle={onToggle}
        onDelete={onDelete}
        onRename={onRename}
        onSetTime={onSetTime}
        onUnschedule={onUnschedule}
        onReorder={onReorder}
      />
    ));

  /*
   * Hafta ölçeğinde bölüm başlığı YOK: ekran başlığı zaten "14 – 20
   * Eylül" yazıyor ve aynı aralığı bir satır altında tekrarlamak boş
   * bir katman olurdu.
   */
  if (scale === "week") {
    return <PlanSheet>{rows(buckets)}</PlanSheet>;
  }

  return (
    <PlanSheet>
      {chunkWeeks(buckets).map((week) => {
        const first = week[0];
        const last = week[week.length - 1];
        if (!first || !last) return null;

        /* Haftanın açık iş sayısı: kapalıyken içeride ne olduğunu
           söyleyen tek işaret. Gün sayaçlarının toplamı — ayrı bir
           hesap değil, aynı `openCount` alanının toplanmışı. */
        const openCount = week.reduce((sum, b) => sum + b.openCount, 0);

        return (
          <PlanWeekSection
            key={first.date}
            id={`hafta-${first.date}`}
            label={formatWeekRange(first.date, last.date)}
            openCount={openCount}
            collapsed={collapsedWeeks.has(first.date)}
            onToggle={() => onToggleWeek(first.date)}
            onPlace={onPlace}
            placing={placing}
            weekStart={first.date}
            goals={weekGoals.get(first.date)}
          >
            {rows(week)}
          </PlanWeekSection>
        );
      })}
    </PlanSheet>
  );
}
