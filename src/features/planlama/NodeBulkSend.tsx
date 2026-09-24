"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { addDays } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import {
  parsePerDayCap,
  planDistribution,
  type NodeTaskDraft,
} from "./distribute";
import type { GoalNode } from "./types";

interface NodeBulkSendProps {
  /** Seçili düğümler, EKRANDAKİ sırayla. */
  nodes: readonly GoalNode[];
  today: DateStr;
  goalId: string;
  pending: boolean;
  onClear: () => void;
  onDistribute: (drafts: readonly NodeTaskDraft[]) => void;
  onError: (message: string) => void;
}

/**
 * Toplu dağıtım çubuğu — seçim yapıldığında ekranın altına yapışır.
 *
 * Tek tek göndermek ("Güne" düğmesi) bir kalem için doğru araç; on
 * kalemi haftaya yaymak için on kez tarih seçmek işkence olurdu. Bu
 * çubuk "seçtiklerimi şu aralığa, günde şu kadar" diyor.
 *
 * ── Neden yapışkan, ayrı bir sayfa değil? ──
 * Kullanıcı seçerken ağacı görmeye devam etmeli: hangi kalemleri
 * işaretlediğini ve kaç tane olduğunu. Ayrı bir ekran, seçimi
 * hatırlamak zorunda bırakırdı.
 *
 * ── Taşma neden sessizce yutulmuyor? ──
 * `planDistribution` sığmayanları `overflow`'da döndürüyor ve burada
 * kullanıcıya SÖYLENİYOR. Sessizce son güne yığmak ya da atmak,
 * kullanıcının seçtiği bir kalemin izini kaybetmesi demekti.
 */
export function NodeBulkSend({
  nodes,
  today,
  goalId,
  pending,
  onClear,
  onDistribute,
  onError,
}: NodeBulkSendProps) {
  const [from, setFrom] = useState<string>(today);
  const [to, setTo] = useState<string>(addDays(today, 6));
  const [cap, setCap] = useState("2");

  const parsedCap = parsePerDayCap(cap);
  const capInvalid = parsedCap === undefined;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (capInvalid || !from || !to) return;

    const plan = planDistribution(
      nodes,
      { from: from as DateStr, to: to as DateStr, perDayCap: parsedCap },
      goalId,
    );

    if (plan.drafts.length === 0) {
      onError("Seçilen aralığa hiçbir kalem sığmadı — aralığı genişlet.");
      return;
    }

    if (plan.overflow.length > 0) {
      onError(
        `${plan.drafts.length} kalem dağıtıldı, ${plan.overflow.length} tanesi sığmadı.`,
      );
    }

    onDistribute(plan.drafts);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-3 z-[var(--z-sticky)] mt-4 flex flex-wrap items-end gap-2.5 rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-overlay)]"
    >
      <p className="tabular w-full text-[length:var(--text-sm)] font-medium">
        {nodes.length} başlık seçildi
      </p>

      <label className="flex flex-col gap-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        Başlangıç
        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="tabular rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[length:var(--text-xs)]"
        />
      </label>

      <label className="flex flex-col gap-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        Bitiş
        <input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="tabular rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[length:var(--text-xs)]"
        />
      </label>

      <label className="flex flex-col gap-1 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        Günde en çok
        <input
          value={cap}
          onChange={(event) => setCap(event.target.value)}
          inputMode="numeric"
          aria-invalid={capInvalid}
          className="tabular w-16 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[length:var(--text-xs)]"
        />
      </label>

      <Button type="submit" size="sm" variant="primary" disabled={capInvalid} loading={pending}>
        Dağıt
      </Button>

      <Button type="button" size="sm" variant="ghost" onClick={onClear}>
        Seçimi bırak
      </Button>

      {capInvalid && (
        <p
          role="alert"
          className="w-full text-[length:var(--text-xs)] text-[var(--color-warn)]"
        >
          Günde en çok kaç kalem? 1 ile 99 arasında bir sayı yaz.
        </p>
      )}
    </form>
  );
}
