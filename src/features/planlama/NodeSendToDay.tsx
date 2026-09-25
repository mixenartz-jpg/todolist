"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { useRevealOnMount } from "@/lib/ui/useRevealOnMount";
import {
  ESTIMATE_PRESETS,
  formatEstimate,
  parseEstimateInput,
} from "@/features/tasks/estimate";
import { addDays, isoWeekday, startOfIsoWeek, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatShortDate, weekdayShort } from "@/lib/ui/tr";
import { multiDayShortcut, type MultiDayShortcut } from "./distribute";

interface NodeSendToDayProps {
  /** Bugünün tarihi — saati okumak bu bileşenin işi değil. */
  today: DateStr;
  pending: boolean;
  /**
   * Bir ya da BİRDEN ÇOK güne gönder — her güne bir görev.
   * `estimateMinutes` null → süre seçilmedi.
   */
  onSend: (dates: readonly DateStr[], estimateMinutes: number | null) => void;
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
 *
 * ── Süre neden GÜNDEN ÖNCE? ──
 * Gün çipleri tek dokunuşla GÖNDERİR. Süre satırı altta olsaydı,
 * önce günü seçen kullanıcı süreyi seçme fırsatı bulamadan görev
 * gitmiş olurdu. Önce "ne kadar", sonra "ne zaman".
 *
 * ── Birden çok gün ──
 * Aynı kalem (ör. "Paragraf rutini") birkaç güne birden gidebilir.
 * "Birden çok gün" kipinde önümüzdeki iki hafta çip olarak seçilir,
 * kısayollar (bu hafta, hafta içi, 7 gün) seçimi doldurur ve tek
 * gönderim her seçili güne bir görev üretir.
 */

/** Çoklu kipte seçilebilen gün sayısı — önümüzdeki iki hafta. */
const MULTI_DAY_SPAN = 14;

const SHORTCUTS: readonly { kind: MultiDayShortcut; label: string }[] = [
  { kind: "rest-of-week", label: "Bu hafta her gün" },
  { kind: "weekdays", label: "Hafta içi" },
  { kind: "next-7", label: "7 gün" },
];
export function NodeSendToDay({
  today,
  pending,
  onSend,
  onCancel,
}: NodeSendToDayProps) {
  const [date, setDate] = useState<string>(today);
  // Açılınca düğmeleriyle birlikte ekrana gelsin (bkz. useRevealOnMount).
  const formRef = useRef<HTMLFormElement>(null);
  useRevealOnMount(formRef);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [customInvalid, setCustomInvalid] = useState(false);
  const [multi, setMulti] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<DateStr>>(new Set());

  const span = Array.from({ length: MULTI_DAY_SPAN }, (_, i) => addDays(today, i));

  function togglePicked(day: DateStr) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  /** Özel kutusu doluysa o, değilse seçili hazır değer. */
  function chosenEstimate(): number | null | "invalid" {
    if (custom.trim().length === 0) return estimate;
    return parseEstimateInput(custom) ?? "invalid";
  }

  function send(targets: readonly DateStr[]) {
    if (targets.length === 0) return;
    const minutes = chosenEstimate();
    if (minutes === "invalid") {
      setCustomInvalid(true);
      return;
    }
    onSend([...targets].sort(), minutes);
  }

  const tomorrow = addDays(today, 1);
  // Gelecek ISO pazartesisi: bu haftanınkine 7 gün eklenir. Bugün
  // pazartesiyse "haftaya" bir sonraki pazartesidir — kullanıcı
  // "haftaya" derken bugünü kastetmiyor.
  const nextMonday = addDays(startOfIsoWeek(today), 7);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (multi) {
      send([...picked]);
      return;
    }
    if (!date) return;
    send([date as DateStr]);
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-surface-2)] p-2.5"
    >
      <div
        role="group"
        aria-label="Tahmini süre"
        className="flex flex-wrap items-center gap-1.5"
      >
        <span className="text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
          Süre
        </span>
        {ESTIMATE_PRESETS.map((minutes) => (
          <QuickChip
            key={minutes}
            label={formatEstimate(minutes)}
            pressed={estimate === minutes && custom.trim().length === 0}
            // Seçili olana tekrar basmak süreyi kaldırır.
            onClick={() => {
              setCustom("");
              setCustomInvalid(false);
              setEstimate((current) => (current === minutes ? null : minutes));
            }}
            disabled={pending}
          />
        ))}
        <input
          value={custom}
          placeholder="Özel: 40, 1,5 saat"
          aria-label="Özel tahmini süre"
          aria-invalid={customInvalid || undefined}
          onChange={(event) => {
            setCustom(event.target.value);
            setCustomInvalid(false);
          }}
          className={cn(
            "w-28 rounded-full border bg-[var(--color-surface)] px-2.5 py-1 text-[length:var(--text-2xs)] outline-none placeholder:text-[var(--color-ink-4)]",
            customInvalid
              ? "border-[var(--color-warn)]"
              : "border-[var(--color-line)] focus:border-[var(--color-accent)]",
          )}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <QuickChip
          label="Birden çok gün"
          pressed={multi}
          onClick={() => setMulti((value) => !value)}
          disabled={pending}
        />
      </div>

      {multi ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {SHORTCUTS.map(({ kind, label }) => (
              <QuickChip
                key={kind}
                label={label}
                onClick={() => setPicked(new Set(multiDayShortcut(today, kind)))}
                disabled={pending}
              />
            ))}
            {picked.size > 0 && (
              <QuickChip
                label="Temizle"
                onClick={() => setPicked(new Set())}
                disabled={pending}
              />
            )}
          </div>

          {/* Önümüzdeki iki hafta — gün adı + gün numarası. */}
          <div
            role="group"
            aria-label="Gönderilecek günler"
            className="grid grid-cols-7 gap-1"
          >
            {span.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={picked.has(day)}
                aria-label={`${formatShortDate(day)} ${weekdayShort(isoWeekday(day))}`}
                onClick={() => togglePicked(day)}
                disabled={pending}
                className={cn(
                  "tabular flex flex-col items-center rounded-md border py-1 text-[length:var(--text-2xs)] leading-tight transition-colors duration-[var(--duration-fast)] disabled:opacity-50",
                  picked.has(day)
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                    : "border-[var(--color-line)] text-[var(--color-ink-2)] hover:border-[var(--color-accent)]",
                )}
              >
                <span className="text-[var(--color-ink-3)]">
                  {weekdayShort(isoWeekday(day))}
                </span>
                <span className="font-medium">{toParts(day).day}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              variant="primary"
              loading={pending}
              disabled={picked.size === 0}
            >
              {picked.size > 0 ? `${picked.size} güne gönder` : "Gün seç"}
            </Button>

            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Vazgeç
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            <QuickChip label="Bugün" onClick={() => send([today])} disabled={pending} />
            <QuickChip label="Yarın" onClick={() => send([tomorrow])} disabled={pending} />
            <QuickChip
              label={`Haftaya · ${formatShortDate(nextMonday)}`}
              onClick={() => send([nextMonday])}
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
        </>
      )}
    </form>
  );
}

function QuickChip({
  label,
  onClick,
  disabled,
  pressed,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  /** Seçim çipi ise basılı durumu; gönderen çiplerde verilmez. */
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={cn(
        "tabular rounded-full border px-2.5 py-1 text-[length:var(--text-2xs)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quart)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50",
        pressed
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
          : "border-[var(--color-line)] text-[var(--color-ink-2)]",
      )}
    >
      {label}
    </button>
  );
}
