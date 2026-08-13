"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { isDateStr } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { ImageDropZone } from "./ImageDropZone";
import { SuggestInput } from "./SuggestInput";
import { dersSuggestions, konuSuggestions } from "./suggest";
import {
  DERS_MAX,
  KONU_MAX,
  MISTAKE_NOTE_MAX,
  type Mistake,
  type MistakeDraft,
  type PendingImage,
} from "./types";

interface MistakeFormProps {
  /** Düzenlenen kayıt; yeni kayıtta yok. */
  initial?: Mistake;
  /** Öneri havuzu: geçmiş tüm yanlışlar. */
  history: readonly Mistake[];
  /** Varsayılan gün (yeni kayıtta bugün). */
  defaultDate: DateStr;
  existingImageUrl?: string | null;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (draft: MistakeDraft) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

const FIELD =
  "w-full rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface-2)] px-3 text-[length:var(--text-base)] outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-line-3)]";

/**
 * Yanlış kaydetme ve düzenleme formu.
 *
 * Ders ve konu önce gelir: çeteleyi anlamlı kılan onlardır ve ikisi de
 * zorunludur. Ekran görüntüsü ile not isteğe bağlıdır — bazen sadece
 * "bu konuda yine takıldım" bilgisi bile değerlidir.
 */
export function MistakeForm({
  initial,
  history,
  defaultDate,
  existingImageUrl,
  submitLabel,
  pending = false,
  onSubmit,
  onCancel,
  onError,
}: MistakeFormProps) {
  const [ders, setDers] = useState(initial?.ders ?? "");
  const [konu, setKonu] = useState(initial?.konu ?? "");
  const [date, setDate] = useState<string>(initial?.date ?? defaultDate);
  const [note, setNote] = useState(initial?.note ?? "");
  const [image, setImage] = useState<PendingImage | null>(null);

  const dersOptions = useMemo(
    () => dersSuggestions(history, ders),
    [history, ders],
  );
  const konuOptions = useMemo(
    () => konuSuggestions(history, ders, konu),
    [history, ders, konu],
  );

  const canSubmit =
    ders.trim().length > 0 &&
    konu.trim().length > 0 &&
    isDateStr(date) &&
    !pending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      ders: ders.trim(),
      konu: konu.trim(),
      date: date as DateStr,
      note: note.trim() ? note.trim() : null,
      image,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <SuggestInput
          label="Ders"
          value={ders}
          suggestions={dersOptions}
          placeholder="Matematik"
          maxLength={DERS_MAX}
          required
          autoFocus
          className="flex-1"
          onChange={setDers}
        />
        <SuggestInput
          label="Konu"
          value={konu}
          suggestions={konuOptions}
          placeholder="Türev"
          maxLength={KONU_MAX}
          required
          className="flex-1"
          onChange={setKonu}
        />
      </div>

      <ImageDropZone
        existingUrl={existingImageUrl}
        onChange={setImage}
        onError={onError}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Not{" "}
          <span className="text-[var(--color-ink-3)]">(isteğe bağlı)</span>
        </span>
        <textarea
          rows={3}
          maxLength={MISTAKE_NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Neyi yanlış yaptın? Doğrusu neydi?"
          className={`${FIELD} resize-y py-2.5 leading-relaxed`}
        />
      </label>

      <label className="flex flex-col gap-1.5 sm:w-44">
        <span className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Tarih
        </span>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${FIELD} tabular h-10`}
        />
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={!canSubmit}>
          {pending ? "Kaydediliyor…" : submitLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
