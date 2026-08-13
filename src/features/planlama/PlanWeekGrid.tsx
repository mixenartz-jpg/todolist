"use client";

import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";
import { PlanDayRow } from "./PlanDayRow";
import { PlanSheet } from "./PlanSheet";
import type { PlanBucket } from "./range";
import type { Category } from "./types";
import "./planlama.css";

/*
 * Hafta ölçeği — ay ile AYNI ajanda kağıdı, tek bölüm.
 *
 * ── Ne değişti? ──
 * Önceki sürüm masaüstünde yedi dar sütun çiziyordu (`min-height: 9rem`)
 * ve `PlanDayColumn` diye ayrı bir kutu bileşeni vardı. Ay kutusundan
 * ayrı durmasının gerekçesi büyüme davranışıydı: "hafta sütunu içeriği
 * kadar uzar, ay kutusu sabit boydadır ve içinde kaydırılır". Ay kutusu
 * artık o değil — ikisi de içeriğe göre uzayan satır, yani ayrımın
 * sebebi ortadan kalktı ve tek `PlanDayRow` ikisini de besliyor.
 *
 * İki ölçek arasındaki tek fark ARALIK: ay 4-6 hafta bölümü, hafta tek
 * bölüm. Yerleşim, ölçüler ve davranış birebir aynı.
 *
 * `WeekGrid`'den (features/week) hâlâ AYRI: buradaki satırlar
 * yerleştirme modunu, sıra düğmelerini ve "havuza geri at" eylemini
 * biliyor. Ortak bir bileşene zorlamak, Hafta ekranının hiç
 * kullanmadığı beş prop'u oradan da geçirmek demekti.
 */

interface PlanWeekGridProps {
  buckets: readonly PlanBucket[];
  today: DateStr;
  /** Kimlikten kategoriye — satırdaki renk noktası için. */
  categoryById: ReadonlyMap<string, Category>;
  /** Havuzdan seçili görev varsa günler yerleştirme hedefi olur. */
  placing: boolean;
  addPending: boolean;
  /** Katlanmış günler — gerekçe PlanMonthGrid'de. */
  collapsedDays: ReadonlySet<DateStr>;
  onToggleCollapsed: (date: DateStr) => void;
  onPlace: (date: DateStr) => void;
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

export function PlanWeekGrid({
  buckets,
  today,
  categoryById,
  placing,
  addPending,
  collapsedDays,
  onToggleCollapsed,
  onPlace,
  onAdd,
  onToggle,
  onDelete,
  onRename,
  onSetTime,
  onUnschedule,
  onReorder,
}: PlanWeekGridProps) {
  return (
    <PlanSheet>
      {buckets.map((bucket) => (
        <PlanDayRow
          key={bucket.date}
          bucket={bucket}
          today={today}
          /* Hafta ölçeğinde gün paneli yok, dolayısıyla plan noktası da
           * yok: nokta panelin yazdığı metni işaret ediyor ve panele
           * gidilemeyen bir yerde anlamsız bir işaret olurdu. */
          hasPlan={false}
          categoryById={categoryById}
          placing={placing}
          addPending={addPending}
          /* Hafta ölçeğinde komşu ay kavramı yok — her gün kapsamda. */
          inScope
          collapsed={collapsedDays.has(bucket.date)}
          onToggleCollapsed={onToggleCollapsed}
          /* `onOpenDay` VERİLMEZ: kanal düğme değil düz blok olur.
           * Sahte bir düğme klavye kullanıcısına anlamsız bir durak
           * eklerdi (bkz. PlanDayRow). */
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
    </PlanSheet>
  );
}
