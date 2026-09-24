"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { addDays, startOfIsoWeek } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { formatShortDate } from "@/lib/ui/tr";

interface NodeSendToDayProps {
  /** Bugünün tarihi — saati okumak bu bileşenin işi değil. */
  today: DateStr;
  pending: boolean;
  onSend: (date: DateStr) => void;
  onCancel: () => void;
}

/**
 * Bir plan kalemini bir güne gönderme denetimi.
 *
 * ── Neden açılır pencere / modal değil? ──
 * Ağaç sayfasındaki her etkileşim satır içinde açılıyor
 * (`GoalCard`'ın düzenleme deseni). Bir tarih seçmek için modal
 * açmak, kullanıcıyı ağaçtan koparıp geri getirmek olurdu; oysa
 * kullanıcı bunu arka arkaya birkaç kalem için yapıyor.
 *
 * ── Neden hem çipler hem tarih alanı? ──
 * Dağıtımların ezici çoğunluğu "bugün", "yarın" ya da "haftaya" —
 * onları tek dokunuşa indiriyoruz. Ama uzak bir tarih de gerekiyor
 * ("ayın sonunda deneme") ve bunun için native `<input type="date">`
 * var: takvim çizmek yerine platformunkini kullanmak, dokunmatikte ve
 * klavyede bedava doğru davranış demek.
 */
export function NodeSendToDay({
  today,
  pending,
  onSend,
  onCancel,
}: NodeSendToDayProps) {
  const [date, setDate] = useState<string>(today);

  const tomorrow = addDays(today, 1);
  // Gelecek ISO pazartesisi: bu haftanınkine 7 gün eklenir. Bugün
  // pazartesiyse "haftaya" bir sonraki pazartesidir — kullanıcı
  // "haftaya" derken bugünü kastetmiyor.
  const nextMonday = addDays(startOfIsoWeek(today), 7);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!date) return;
    onSend(date as DateStr);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-surface-2)] p-2.5"
    >
      <div className="flex flex-wrap gap-1.5">
        <QuickChip label="Bugün" onClick={() => onSend(today)} disabled={pending} />
        <QuickChip label="Yarın" onClick={() => onSend(tomorrow)} disabled={pending} />
        <QuickChip
          label={`Haftaya · ${formatShortDate(nextMonday)}`}
          onClick={() => onSend(nextMonday)}
          disabled={pending}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          aria-label="Gönderilecek tarih"
          className="tabular rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[length:var(--text-xs)]"
        />

        <Button type="submit" size="sm" variant="primary" loading={pending}>
          Gönder
        </Button>

        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

function QuickChip({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[length:var(--text-2xs)] text-[var(--color-ink-2)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
    >
      {label}
    </button>
  );
}
