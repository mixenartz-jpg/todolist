"use client";

import type { DateStr } from "@/lib/date/types";
import { formatWeekRange } from "@/lib/ui/tr";
import type { Task } from "@/features/tasks/types";
import type { DaySummary } from "./dayplan";
import { PlanDayRow } from "./PlanDayRow";
import { PlanSheet, PlanWeekSection } from "./PlanSheet";
import { chunkWeeks, type PlanBucket } from "./range";
import type { Category } from "./types";
import "./planlama.css";

/*
 * Ay ölçeği — ajanda kağıdı.
 *
 * ── Ne değişti ve neden? ──
 * Önceki sürüm hafta satırlarında 7 dar sütun çiziyordu; her gün sabit
 * 20rem'lik bir kutuydu ve kutu KENDİ İÇİNDE kaydırılıyordu. Yani ayda
 * 42 ayrı mini pencere vardı ve hiçbirine tam bir görev adı sığmıyordu
 * (`PlanTaskList` yorumu bunu itiraf ediyordu: "sütun ~150px").
 *
 * Şimdi tek bir kağıt var: haftalar bölüm, günler geniş yatay satır.
 * Solda hizalı tarih kanalı, sağda tam genişlik görev alanı. İç
 * kaydırma yok — hiçbir görev gizlenmiyor.
 *
 * ── Açık iş sayısı neden HÂLÂ duruyor? ──
 * Eski gerekçesi "kutu kaydırılabilir, görünen satırlar günün tamamı
 * olmayabilir"di ve o gerekçe artık geçersiz. Sayı yine de kalıyor
 * ama başka bir iş için: kanalda, tarihin altında, günün ağırlığını
 * ay boyunca aşağı kayarken tek bakışta veren ölçü.
 *
 * ── Gün paneli neden DURUYOR? ──
 * Satır görevleri düzenletir ama günün plan METNİ (`DayPlanEditor`),
 * kategori ve hedef seçicileri yalnızca panelde. Plan noktası da
 * panelin yazdığı şeyi işaret ediyor.
 *
 * Takvim ekranının ızgarasından AYRI: orada hücre rutin yoğunluğunu
 * gösterir, burada gün KURULUR.
 */

interface PlanMonthGridProps {
  buckets: readonly PlanBucket[];
  today: DateStr;
  /**
   * Gün başına özet — kanaldaki plan noktası.
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
  /**
   * Katlanmış günler.
   *
   * Ekranda tutulur, satırda değil: 42 satırın her birinin kendi
   * `useState`'i olsaydı ay değiştirildiğinde hepsi sıfırlanırdı.
   */
  collapsedDays: ReadonlySet<DateStr>;
  onToggleCollapsed: (date: DateStr) => void;
  /**
   * Katlanmış haftalar — bölüm başlangıç tarihiyle anahtarlanır.
   *
   * Varsayılan KAPALI (bkz. useCollapsedWeeks): dolu bir ay altı
   * hafta × yedi gün açılırsa sayfa metrelerce uzar. Bugünün haftası
   * açık gelir ki ekran açıldığında "şu an ne yapmalıyım" cevabı
   * hazır dursun.
   */
  collapsedWeeks: ReadonlySet<DateStr>;
  onToggleWeek: (weekStart: DateStr) => void;
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

export function PlanMonthGrid({
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
    <PlanSheet>
      {weeks.map((week) => {
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
            /* Yerleştirme modunda katlama devre dışı: kapalı bir
               haftanın günleri DOM'da olmasaydı oraya iş atamanın
               hiçbir yolu kalmazdı (bkz. PlanSheet). */
            forceOpen={placing}
          >
            {week.map((bucket) => (
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
            ))}
          </PlanWeekSection>
        );
      })}
    </PlanSheet>
  );
}
