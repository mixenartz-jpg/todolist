"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";
import type { CoachNote } from "@/features/results/types";
import type { DateStr } from "@/lib/date/types";
import { CoachNoteEditor } from "./CoachNoteEditor";
import type { DayMode } from "./days";

/**
 * "Koçtan notlar". Öğrenci ve önizlemede salt okunur; koç kipinde
 * günün notu yazılır/düzenlenir (coach_notes).
 */
export function CoachNotesCard({
  mode,
  notes,
  date,
  studentId,
}: {
  mode: DayMode;
  notes: readonly CoachNote[];
  date: DateStr;
  studentId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const dayNote = notes.find((n) => n.scale === "day");
  const canEdit = mode === "coach" && studentId !== null;

  return (
    <Card as="section" aria-label="Koçtan notlar">
      <SectionTitle
        level={2}
        trailing={
          canEdit &&
          !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[length:var(--text-sm)] text-[var(--color-accent)] hover:underline"
            >
              {dayNote ? "Düzenle" : "Not yaz"}
            </button>
          )
        }
      >
        {mode === "coach" ? "Koç notu" : "Koçtan notlar"}
      </SectionTitle>

      {editing && studentId ? (
        <div className="mt-2">
          <CoachNoteEditor
            key={dayNote?.updatedAt ?? "new"}
            date={date}
            studentId={studentId}
            initial={dayNote?.note ?? ""}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : notes.length === 0 ? (
        <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
          {mode === "coach" ? "Bu güne not yazılmadı. Öğrenci bu kartı kendi ekranında görür." : "Bu gün için not yok."}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {notes.map((n) => (
            <li
              key={`${n.date}-${n.scale}`}
              className="whitespace-pre-wrap text-[length:var(--text-base)] leading-[var(--leading-relaxed)] text-[var(--color-ink)]"
            >
              {n.scale === "week" && (
                <span className="mr-1 text-[length:var(--text-2xs)] uppercase text-[var(--color-ink-3)]">
                  Hafta ·
                </span>
              )}
              {n.note}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
