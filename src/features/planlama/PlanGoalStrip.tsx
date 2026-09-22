"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, TextInput } from "@/components/Field";
import type { DateStr } from "@/lib/date/types";
import { slotVar } from "@/lib/ui/colors";
import { cn } from "@/lib/ui/cn";
import { formatShortDate } from "@/lib/ui/tr";
import type { GoalProgress } from "./rollup";

interface PlanGoalStripProps {
  /** Ayın hedefleri, ilerlemeleriyle. */
  goals: readonly GoalProgress[];
  /** Hedeften türetilen iş hangi güne düşsün? Hafta ölçeğinde çapa. */
  defaultDate: DateStr;
  addPending: boolean;
  /** Hedefe bağlı yeni görev — `goalId` ile doğar. */
  onAddTask: (title: string, date: DateStr, goalId: string) => void;
}

/**
 * Hedef şeridi — ekranın tepesinde, sabit.
 *
 * ── Neden burada? ──
 * Hedefler ayrı bir sekmedeydi (`/planlama/hedefler`) ve plan yaparken
 * görünmüyorlardı. "Neyi hedefliyorum" ile "bu hafta ne yapacağım"
 * ayrı ekranlarda durunca, ikisi arasındaki bağ kullanıcının
 * hafızasına kalıyordu. Şerit bu bağı ekrana taşıyor: planı yaparken
 * hedefler gözünün önünde.
 *
 * Sekme SİLİNMEDİ — hedef oluşturma, düzenleme, arşivleme hâlâ orada.
 * Şerit bir ÖZET ve bir kısayol, yönetim yüzeyi değil.
 *
 * ── `[+]` neden doğrudan burada? ──
 * Planın asıl hamlesi bu: hedeften iş TÜRETİLİR. Kullanıcı hedefe
 * basıp görev yazdığında görev `goalId` ile DOĞAR — sonradan
 * bağlanmaz. Sonradan bağlama akışı zaten vardı (gün panelindeki
 * hedef seçici) ve pratikte hiç kullanılmıyordu, çünkü görevi
 * yazarken hedefi düşünmek için bir sebep yoktu.
 */
export function PlanGoalStrip({
  goals,
  defaultDate,
  addPending,
  onAddTask,
}: PlanGoalStripProps) {
  /** Hangi hedefin ekleme kutusu açık? Aynı anda yalnızca biri. */
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);

  // Hiç hedef yoksa şerit çizilmez. Boş bir kutu ekranın tepesinde
  // her gün yer kaplayıp hiçbir şey söylemezdi.
  if (goals.length === 0) return null;

  return (
    <section
      aria-label="Ayın hedefleri"
      className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
          Hedefler
        </h2>
        <Link
          href="/planlama/hedefler"
          className="text-[length:var(--text-xs)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-accent)]"
        >
          Yönet
        </Link>
      </div>

      <ul className="flex flex-col gap-1.5">
        {goals.map((progress) => (
          <li key={progress.goal.id}>
            <HedefSatiri
              progress={progress}
              open={openGoalId === progress.goal.id}
              defaultDate={defaultDate}
              addPending={addPending}
              onToggleOpen={() =>
                setOpenGoalId((id) =>
                  id === progress.goal.id ? null : progress.goal.id,
                )
              }
              onAddTask={(title) => {
                onAddTask(title, defaultDate, progress.goal.id);
                setOpenGoalId(null);
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function HedefSatiri({
  progress,
  open,
  defaultDate,
  addPending,
  onToggleOpen,
  onAddTask,
}: {
  progress: GoalProgress;
  open: boolean;
  defaultDate: DateStr;
  addPending: boolean;
  onToggleOpen: () => void;
  onAddTask: (title: string) => void;
}) {
  const { goal, ratio, taskDone, taskTotal, source } = progress;

  return (
    <div className="rounded-lg bg-[var(--color-surface-2)] px-2.5 py-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: slotVar(goal.colorSlot) }}
        />

        <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)]">
          {goal.title}
        </span>

        {/*
         * İlerleme metni. `ratio === null` (ölçülmüyor) durumunda
         * HİÇBİR sayı yazılmaz — "%0" yazmak, ölçüsü olmayan bir
         * hedefi hiç ilerlememiş gibi gösterirdi (`goalProgress`'in
         * `none` modunun ekran karşılığı).
         */}
        {ratio !== null && (
          <span className="tabular shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {source === "count"
              ? `${goal.doneCount}/${goal.targetCount}`
              : `${taskDone}/${taskTotal}`}
          </span>
        )}

        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-label={`${goal.title} hedefine iş ekle`}
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded text-[length:var(--text-base)] leading-none",
            "transition-colors duration-[var(--duration-fast)]",
            open
              ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
              : "text-[var(--color-ink-3)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink)]",
          )}
        >
          +
        </button>
      </div>

      {/* İlerleme çubuğu yalnızca ölçülebilir hedeflerde. */}
      {ratio !== null && (
        <span
          aria-hidden
          className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]"
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${Math.round(ratio * 100)}%`,
              background: slotVar(goal.colorSlot),
            }}
          />
        </span>
      )}

      {open && (
        <GoalTaskForm
          goalTitle={goal.title}
          defaultDate={defaultDate}
          pending={addPending}
          onSubmit={onAddTask}
        />
      )}
    </div>
  );
}

/**
 * Hedeften iş türetme kutusu.
 *
 * Tek alan: başlık. Tarih ŞU AN bakılan haftanın/ayın çapası ve
 * sorulmuyor — sorulsaydı "hedeften hızlıca iş çıkar" hamlesi iki
 * karara dönerdi. Tarih yanlışsa görev satırından taşınabiliyor.
 */
function GoalTaskForm({
  goalTitle,
  defaultDate,
  pending,
  onSubmit,
}: {
  goalTitle: string;
  defaultDate: DateStr;
  pending: boolean;
  onSubmit: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const trimmed = title.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed === "" || pending) return;
        onSubmit(trimmed);
        setTitle("");
      }}
      className="mt-2"
    >
      <Field label={`${goalTitle} için iş`} labelHidden>
        {(props) => (
          <TextInput
            {...props}
            size="sm"
            /* Kutu açıldığı anda yazmaya başlanabilmeli: kullanıcı
               `+`'a bastıysa niyeti zaten yazmak. */
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${formatShortDate(defaultDate)} için iş yaz…`}
          />
        )}
      </Field>
    </form>
  );
}
