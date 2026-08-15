"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import type { DateStr } from "@/lib/date/types";
import { ColorSlotPicker } from "./ColorSlotPicker";
import {
  MONTH_PLAN_BODY_MAX,
  MONTH_PLAN_TITLE_MAX,
  normalizeGoalTitle,
} from "./goal";
import type { MonthPlan, MonthPlanDraft } from "./types";

interface MonthPlanFormProps {
  month: DateStr;
  /** Düzenleme modunda mevcut not; yoksa yeni not formu. */
  initial?: MonthPlan;
  sortOrder: number;
  pending: boolean;
  onSubmit: (draft: MonthPlanDraft) => void;
  onCancel?: () => void;
}

/**
 * Genel planlama notu oluşturma ve düzenleme formu.
 *
 * `GoalForm`'un daha kısası: sayısal hedef alanı YOK, çünkü not
 * ölçülmez. Geriye başlık, ayrıntı ve renk kalıyor — hedefle aynı üç
 * alan, aynı sırada, aynı sınırlarla. İki sekme arasında geçen
 * kullanıcı aynı formu bulmalı.
 *
 * `normalizeGoalTitle` YENİDEN KULLANILIYOR: kural birebir aynı (boş
 * ya da yalnızca boşluk → geçersiz, sınırda kırp) ve ikinci bir kopya
 * yazmak, biri değişince ötekinin sessizce ayrışması demekti.
 */
export function MonthPlanForm({
  month,
  initial,
  sortOrder,
  pending,
  onSubmit,
  onCancel,
}: MonthPlanFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [colorSlot, setColorSlot] = useState(initial?.colorSlot ?? 0);

  const normalizedTitle = normalizeGoalTitle(title);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (normalizedTitle === null) return;

    onSubmit({
      month,
      title: normalizedTitle,
      body: body.trim() ? body.trim() : null,
      colorSlot,
      sortOrder,
    });

    // Yeni not formu ekranda KALIR ve temizlenir: kullanıcı ay başında
    // genelde arka arkaya birkaç not yazar (GoalForm ile aynı davranış).
    if (!initial) {
      setTitle("");
      setBody("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={MONTH_PLAN_TITLE_MAX}
        placeholder="Neyi not almak istiyorsun?"
        aria-label="Not başlığı"
        className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[length:var(--text-base)] placeholder:text-[var(--color-ink-3)]"
      />

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={MONTH_PLAN_BODY_MAX}
        /*
         * 5 satır — GoalForm'un 2'sinin üstünde. Hedefin ayrıntısı
         * genelde tek cümledir ("haftada 3 gün"), notun gövdesi ise
         * asıl içeriktir; iki satırlık bir kutu uzun yazmayı fiziksel
         * olarak caydırırdı.
         */
        rows={5}
        placeholder="Ayrıntı (isteğe bağlı)"
        aria-label="Not ayrıntısı"
        className="w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[length:var(--text-sm)] leading-relaxed placeholder:text-[var(--color-ink-3)]"
      />

      <ColorSlotPicker
        value={colorSlot}
        onChange={setColorSlot}
        legend="Not rengi"
      />

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          variant="primary"
          disabled={normalizedTitle === null}
          loading={pending}
        >
          {initial ? "Kaydet" : "Not ekle"}
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
