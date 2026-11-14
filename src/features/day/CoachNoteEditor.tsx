"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { TextArea } from "@/components/Field";
import { useSaveCoachNote } from "@/features/results/mutations";
import type { DateStr } from "@/lib/date/types";

/**
 * Koç notu yazma/silme — Planlama gün başlığı ve Gün görünümündeki
 * not kartı aynı düzenleyiciyi kullanır. Boş bırakıp kaydetmek notu
 * siler.
 */
export function CoachNoteEditor({
  date,
  studentId,
  initial,
  onDone,
}: {
  date: DateStr;
  studentId: string;
  initial: string;
  onDone: () => void;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const save = useSaveCoachNote(studentId, setError);

  return (
    <div className="flex flex-col gap-1.5">
      <TextArea
        rows={3}
        maxLength={4000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Öğrencinin o gün göreceği not"
        aria-label="Koç notu"
        className="text-[length:var(--text-sm)]"
        autoFocus
      />
      {error && <p className="text-[length:var(--text-2xs)] text-[var(--color-danger)]">{error}</p>}
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" type="button" onClick={onDone}>
          Vazgeç
        </Button>
        <Button
          size="sm"
          type="button"
          loading={save.isPending}
          disabled={text.trim() === initial.trim()}
          onClick={() => save.mutate({ date, note: text }, { onSuccess: onDone })}
        >
          {text.trim() === "" && initial ? "Notu sil" : "Kaydet"}
        </Button>
      </div>
    </div>
  );
}
