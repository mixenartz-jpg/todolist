"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import type { DateStr } from "@/lib/date/types";
import { ColorSlotPicker } from "./ColorSlotPicker";
import {
  GOAL_NOTE_MAX,
  GOAL_TITLE_MAX,
  normalizeGoalTitle,
  parseTargetCount,
} from "./goal";
import type { PlanGoal, PlanGoalDraft } from "./types";

interface GoalFormProps {
  month: DateStr;
  /** Düzenleme modunda mevcut hedef; yoksa yeni hedef formu. */
  initial?: PlanGoal;
  sortOrder: number;
  pending: boolean;
  onSubmit: (draft: PlanGoalDraft) => void;
  onCancel?: () => void;
}

/**
 * Hedef oluşturma ve düzenleme formu.
 *
 * Sayısal hedef alanı İSTEĞE BAĞLIDIR ve boş bırakmak geçerli bir
 * seçimdir — o zaman ilerleme bağlı görevlerden okunur. Bu yüzden alan
 * "zorunlu değil" diye etiketlenmez, ne yaptığı YAZILIR: kullanıcı
 * boş bırakmanın da bir anlamı olduğunu görmeli.
 */
export function GoalForm({
  month,
  initial,
  sortOrder,
  pending,
  onSubmit,
  onCancel,
}: GoalFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [target, setTarget] = useState(
    initial?.targetCount === null || initial?.targetCount === undefined
      ? ""
      : String(initial.targetCount),
  );
  const [colorSlot, setColorSlot] = useState(initial?.colorSlot ?? 0);

  const normalizedTitle = normalizeGoalTitle(title);
  const parsedTarget = parseTargetCount(target);
  // `undefined` = bozuk girdi (bkz. goal.ts'in üç durumlu sözleşmesi).
  const targetInvalid = parsedTarget === undefined;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (normalizedTitle === null || targetInvalid) return;

    onSubmit({
      month,
      title: normalizedTitle,
      note: note.trim() ? note.trim() : null,
      targetCount: parsedTarget,
      colorSlot,
      sortOrder,
    });

    if (!initial) {
      setTitle("");
      setNote("");
      setTarget("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={GOAL_TITLE_MAX}
        placeholder="Bu ay ne yapacaksın?"
        aria-label="Hedef başlığı"
        className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[length:var(--text-base)] placeholder:text-[var(--color-ink-3)]"
      />

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={GOAL_NOTE_MAX}
        rows={2}
        placeholder="Ayrıntı (isteğe bağlı)"
        aria-label="Hedef ayrıntısı"
        className="w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[length:var(--text-sm)] leading-relaxed placeholder:text-[var(--color-ink-3)]"
      />

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
          Sayısal hedef
          <input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            inputMode="numeric"
            placeholder="30"
            aria-invalid={targetInvalid}
            className="tabular w-20 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[length:var(--text-sm)] placeholder:text-[var(--color-ink-3)]"
          />
        </label>

        {targetInvalid ? (
          <p
            role="alert"
            className="text-[length:var(--text-xs)] text-[var(--color-warn)]"
          >
            1 ile 9999 arasında bir tam sayı yaz.
          </p>
        ) : (
          /* Boş bırakmanın ne anlama geldiğini YAZAR: kullanıcı bunu
             bir eksiklik değil, bir seçim olarak görmeli. */
          <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            Boş bırakırsan ilerleme, bu hedefe bağladığın görevlerden
            hesaplanır.
          </p>
        )}
      </div>

      <ColorSlotPicker
        value={colorSlot}
        onChange={setColorSlot}
        legend="Hedef rengi"
      />

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          variant="primary"
          disabled={normalizedTitle === null || targetInvalid}
          loading={pending}
        >
          {initial ? "Kaydet" : "Hedef ekle"}
        </Button>

        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
      </div>
    </form>
  );
}
