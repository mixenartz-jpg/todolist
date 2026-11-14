"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { addDays, isDateStr, todayStr } from "@/lib/date/date";
import { formatShortDate } from "@/lib/ui/tr";
import { slotVar } from "@/lib/ui/colors";
import { formatEstimate } from "@/features/tasks/estimate";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query/keys";
import { useArchiveRoutine } from "./mutations";
import { useStudentRoutines } from "./queries";
import { RoutineForm } from "./RoutineForm";
import { describeSchedule, scheduleAt } from "./schedule";
import type { RoutineDraft, RoutineWithSchedule } from "./types";
import { addRoutineTask } from "./useRoutineTaskSync";

/**
 * Rutinler sayfasında ÖĞRENCİ rutinleri grubu (0037). Koçun kendi
 * rutinlerinden ayrı: bunlar görev üretir, seri/entries'e girmez.
 * Esnek programlı olanlar otomatik düşmez; buradan güne eklenir.
 */
export function StudentRoutinesSection({
  studentId,
  onUpdate,
  updatePending,
  onError,
}: {
  studentId: string | null;
  onUpdate: (routine: RoutineWithSchedule, draft: RoutineDraft, done: () => void) => void;
  updatePending: boolean;
  onError: (m: string) => void;
}) {
  const { data: routines = [] } = useStudentRoutines();
  const archive = useArchiveRoutine();
  const [editing, setEditing] = useState<string | null>(null);
  const today = todayStr();
  const active = routines.filter((r) => r.archivedAt === null && (r.endDate === null || r.endDate >= today));

  if (active.length === 0 && studentId === null) return null;

  return (
    <section aria-label="Öğrenci rutinleri" className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">Öğrenci rutinleri</h2>
        <span className="tabular text-[length:var(--text-xs)] text-[var(--color-ink-3)]">{active.length}</span>
      </div>
      {active.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-line)] px-3.5 py-3 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          Henüz öğrenci rutini yok. &quot;Yeni rutin&quot; → Kimin için: Öğrenci.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((r) =>
            editing === r.id ? (
              <li key={r.id} className="rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4">
                <RoutineForm
                  initial={{
                    name: r.name,
                    colorSlot: r.colorSlot,
                    target: r.target,
                    unit: r.unit,
                    schedule: scheduleAt(r, today) ?? { kind: "daily" },
                    endDate: r.endDate,
                    categoryId: r.categoryId,
                    studentId: r.studentId,
                    estimateMinutes: r.estimateMinutes,
                  }}
                  submitLabel="Kaydet"
                  pending={updatePending}
                  otherRoutines={active.filter((x) => x.id !== r.id)}
                  studentId={studentId}
                  ownerLocked
                  onSubmit={(draft) => onUpdate(r, draft, () => setEditing(null))}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <StudentRoutineRow
                key={r.id}
                routine={r}
                onEdit={() => setEditing(r.id)}
                onArchive={() => archive.mutate({ id: r.id, archived: true }, { onError: (e) => onError(e instanceof Error ? e.message : "Arşivlenemedi") })}
                onError={onError}
              />
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function StudentRoutineRow({
  routine,
  onEdit,
  onArchive,
  onError,
}: {
  routine: RoutineWithSchedule;
  onEdit: () => void;
  onArchive: () => void;
  onError: (m: string) => void;
}) {
  const qc = useQueryClient();
  const today = todayStr();
  const schedule = scheduleAt(routine, today) ?? { kind: "daily" as const };
  const flexible = schedule.kind === "flexible";
  const [date, setDate] = useState<string>(addDays(today, 1));
  const [busy, setBusy] = useState(false);

  async function addToDay() {
    if (!isDateStr(date)) return;
    setBusy(true);
    try {
      const n = await addRoutineTask(routine.id, date);
      onError(n > 0 ? `${formatShortDate(date)} gününe eklendi` : "O güne zaten eklenmiş");
      qc.invalidateQueries({ queryKey: qk.tasks() });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: slotVar(routine.colorSlot) }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[length:var(--text-base)]">Rutin | {routine.name}</p>
        <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
          {describeSchedule(schedule)}
          {routine.estimateMinutes ? ` · ${formatEstimate(routine.estimateMinutes)}` : ""}
          {flexible ? " · otomatik düşmez" : ""}
        </p>
      </div>
      {flexible && (
        <span className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label={`${routine.name} eklenecek gün`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="tabular h-8 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface)] px-2 text-[length:var(--text-sm)]"
          />
          <Button size="sm" variant="secondary" loading={busy} onClick={addToDay}>
            Güne ekle
          </Button>
        </span>
      )}
      <Button size="sm" variant="ghost" onClick={onEdit}>
        Düzenle
      </Button>
      <Button size="sm" variant="ghost" onClick={onArchive}>
        Arşivle
      </Button>
    </li>
  );
}
