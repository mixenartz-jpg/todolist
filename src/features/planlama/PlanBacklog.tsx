"use client";

import { cn } from "@/lib/ui/cn";
import { SectionHeading } from "@/features/sections/SectionHeading";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import type { Task } from "@/features/tasks/types";
import { CategoryDot } from "./CategoryDot";
import type { Category } from "./types";
import "./planlama.css";

interface PlanBacklogProps {
  tasks: readonly Task[];
  /** Kimlikten kategoriye — satırdaki renk noktası için. */
  categoryById: ReadonlyMap<string, Category>;
  /** Şu an seçili olan görev — ızgara yerleştirme modundadır. */
  selectedId: string | null;
  addPending: boolean;
  onSelect: (id: string | null) => void;
  onAdd: (title: string) => void;
  onError?: (message: string) => void;
}

/**
 * Tarihsiz görev havuzu — "bir ara yapılacaklar".
 *
 * Bu ekranın var olma sebebi: bu görevler bugüne kadar YALNIZCA Bugün
 * ekranında, katlanmış bir bölümün içinde duruyordu ve haftalık
 * plandan görünmüyordu (`buildWeekPlan` onları atıyor). Yani "şu işi
 * bu haftaya koyayım" hareketi hiçbir yerde yoktu.
 *
 * ── Neden SÜRÜKLE-BIRAK değil, iki dokunuş? ──
 * `DayPicker`'daki gerekçenin aynısı: sürükleme dokunmada sayfa
 * kaydırmasıyla çakışır, klavyeyle karşılığı yoktur ve ekran okuyucuya
 * hiçbir şey söylemez. Burada seçim `aria-pressed` ile duyurulur, gün
 * hücreleri de yerleştirme modunda kendi etiketlerini değiştirir —
 * hareketin tamamı klavyeyle de yapılabilir.
 *
 * Satırlar `TaskItem` DEĞİL: havuzda ne saat, ne gün taşıma, ne
 * tamamlama var. Buradaki tek eylem "bir güne yerleştir" ve satırın
 * tamamı o eylemin hedefidir; `TaskItem`'ın üç ikonu bu tek işi
 * gürültüye boğardı.
 */
export function PlanBacklog({
  tasks,
  categoryById,
  selectedId,
  addPending,
  onSelect,
  onAdd,
  onError,
}: PlanBacklogProps) {
  return (
    <section className="planBacklog">
      <SectionHeading
        sectionKey="plan.backlog"
        onError={onError}
        trailing={
          tasks.length > 0 ? (
            <span className="tabular text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
              {tasks.length}
            </span>
          ) : undefined
        }
      />

      {tasks.length === 0 ? (
        <p className="mb-2.5 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          Tarihi olmayan iş yok. Buraya eklediklerin bir güne
          yerleştirilmeyi bekler.
        </p>
      ) : (
        <ul className="mb-2.5 flex flex-col gap-1.5">
          {tasks.map((task) => {
            const selected = task.id === selectedId;
            const category =
              task.categoryId === null
                ? undefined
                : categoryById.get(task.categoryId);

            return (
              <li key={task.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  /* Etiket eylemi söyler, durumu değil: `aria-pressed`
                     zaten seçili olup olmadığını duyuruyor. Kategori adı
                     etikete GİRER çünkü nokta aria-hidden'dır ve renk
                     tek başına bilgi taşımamalı. */
                  aria-label={
                    category
                      ? `${task.title} (${category.name}): bir güne yerleştir`
                      : `${task.title}: bir güne yerleştir`
                  }
                  onClick={() => onSelect(selected ? null : task.id)}
                  className={cn(
                    "rowEnter flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left",
                    "text-[length:var(--text-base)]",
                    "transition-colors duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
                    selected
                      ? "border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_12%,transparent)]"
                      : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-2)]",
                  )}
                >
                  {category && <CategoryDot category={category} />}

                  <span className="min-w-0 flex-1 truncate">{task.title}</span>

                  {/* Seçiliyken ne yapılacağını YAZIYLA söyler. Renk ve
                      kesikli kenarlık tek başına bilgi taşımamalı. */}
                  {selected && (
                    <span className="shrink-0 text-[length:var(--text-2xs)] text-[var(--color-accent)]">
                      gün seç
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <TaskQuickAdd dueDate={null} pending={addPending} onAdd={onAdd} />
    </section>
  );
}
