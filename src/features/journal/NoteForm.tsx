"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { isDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { NOTE_BODY_MAX, NOTE_TITLE_MAX, type NoteDraft } from "./types";

interface NoteFormProps {
  initial?: Partial<NoteDraft>;
  /** Formun ait olduğu varsayılan gün (yeni notta bugün). */
  defaultDate: DateStr;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (draft: NoteDraft) => void;
  onCancel: () => void;
}

const FIELD =
  "w-full rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface-2)] px-3 text-[length:var(--text-base)] outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-line-3)]";

/**
 * Not yazma ve düzenleme formu.
 *
 * Başlık isteğe bağlıdır ve bilinçli olarak İKİNCİ sıradadır: not
 * yazmanın asıl işi gövdedir, başlık alanını üste koymak her seferinde
 * bir başlık uydurma yükü hissettirir. Gövde boşken kaydet düğmesi
 * çalışmaz — içeriksiz not kayıt değil, gürültüdür.
 */
export function NoteForm({
  initial,
  defaultDate,
  submitLabel,
  pending = false,
  onSubmit,
  onCancel,
}: NoteFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [date, setDate] = useState<string>(initial?.date ?? defaultDate);

  const trimmedBody = body.trim();
  const dateValid = isDateStr(date);
  const canSubmit = trimmedBody.length > 0 && dateValid && !pending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      title: title.trim() ? title.trim() : null,
      body: trimmedBody,
      date: date as DateStr,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Not
        </span>
        <textarea
          autoFocus
          required
          rows={6}
          maxLength={NOTE_BODY_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Aklından geçeni yaz…"
          className={`${FIELD} resize-y py-2.5 leading-relaxed`}
        />
      </label>

      <div className="flex flex-col gap-4 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            Başlık{" "}
            <span className="text-[var(--color-ink-3)]">(isteğe bağlı)</span>
          </span>
          <input
            maxLength={NOTE_TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Boş bırakırsan ilk satır kullanılır"
            className={`${FIELD} h-10`}
          />
        </label>

        <label className="flex flex-col gap-1.5 sm:w-44">
          <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            Tarih
          </span>
          {/*
            Native `date` girdisi: takvim, klavye girişi ve yerel biçim
            tarayıcıdan gelir. Kendi tarih seçicimizi yazmak, standart
            bir davranışı yeniden icat etmek olurdu.
          */}
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${FIELD} tabular h-10`}
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={!canSubmit}>
          {pending ? "Kaydediliyor…" : submitLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Vazgeç
        </Button>

        {body.length > NOTE_BODY_MAX - 500 && (
          <span className="tabular ml-auto text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {body.length}/{NOTE_BODY_MAX}
          </span>
        )}
      </div>
    </form>
  );
}
