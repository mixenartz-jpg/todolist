"use client";

import Link from "next/link";
import { cn } from "@/lib/ui/cn";
import { formatShortDate } from "@/lib/ui/tr";
import { SLOT_HEX } from "@/lib/ui/colors";
import type { DateStr } from "@/lib/date/types";
import { isOverdue } from "@/features/tasks/queries";
import type { Task } from "@/features/tasks/types";
import type { PlanGoal } from "@/features/planlama/types";
import { useZen } from "@/features/zen/ZenProvider";

/**
 * "Şimdi bu" — günün tek işini büyük gösteren kart.
 *
 * ── Neden liste yetmiyor? ──
 * Liste "bugün ne var" der; koç "şimdi ne yapmalısın" der. On
 * maddelik bir listeye bakan kişi hangisine başlayacağına karar
 * vermek zorunda kalır ve o karar, çoğu zaman işin kendisinden daha
 * çok enerji yer. Kart o kararı verir ve gerekçesini de gösterir
 * (gecikmişse "şu tarihten taşındı" yazar).
 *
 * ── Tek BİRİNCİL eylem ──
 * "Bitti" düğmesi kartın tek dolu düğmesi. Sil/ertele/düzenle hepsi
 * listede zaten var; kartta tekrarlamak, "şimdi bu işi yap" mesajını
 * beş seçenekli bir menüye çevirirdi.
 *
 * ── Glow ──
 * Kart `--glow-accent-md` taşıyor ve bu, ışımanın izinli olduğu dört
 * yerden biri. Gerekçe: ekranın en önemli öğesi ve ışıma burada
 * dekorasyon değil, hiyerarşi bildiriyor.
 */
export function FocusCard({
  task,
  goal,
  today,
  openCount,
  onDone,
}: {
  /** `null` → bugün için açık iş kalmadı. */
  task: Task | null;
  /** Görevin bağlı olduğu aylık hedef; yoksa null. */
  goal: PlanGoal | null;
  today: DateStr;
  openCount: number;
  onDone: () => void;
}) {
  /*
   * Hook erken dönüşten ÖNCE: `task === null` dalı hook'u atlarsa
   * React sıra tutarlılığı bozulur ("rendered fewer hooks than
   * expected").
   */
  const zen = useZen();

  if (task === null) {
    return (
      <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 md:p-6">
        <p className="text-[length:var(--text-lg)] font-semibold tracking-[-0.015em]">
          Bugün için planlanmış iş kalmadı
        </p>
        {/*
          Boş durum ÖĞRETİR, "bir şey yok" demez: kullanıcıyı günü
          kapatmaya ya da yarını kurmaya yönlendirir. Bu, mevcut
          `EmptyState` dilinin sürdürülmesi.
        */}
        <p className="mt-1.5 text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
          Günü kapatmadan önce yarına ne koyacağına bakabilir ya da
          havuzdan bir iş çekebilirsin.
        </p>
        <Link
          href="/planlama"
          className="mt-4 inline-flex h-9 items-center rounded-lg border border-[var(--color-line-2)] px-3.5 text-[length:var(--text-sm)] transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-accent)]"
        >
          Planlamaya git
        </Link>
      </section>
    );
  }

  const overdue = isOverdue(task, today);

  return (
    <section
      className={cn(
        "rounded-2xl border p-5 md:p-6",
        "border-[var(--color-accent)] bg-[var(--color-surface)]",
        "shadow-[var(--glow-accent-md)]",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-[length:var(--text-xs)] font-medium uppercase tracking-[0.08em] text-[var(--color-accent)]">
          Şimdi bu
        </span>

        {/* Arkada bekleyen iş sayısı: kart tek işi gösteriyor, ama
            günün ağırlığını bilmek kullanıcının ölçüsünü kurar. */}
        {openCount > 1 && (
          <span className="tabular text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            +{openCount - 1} iş daha
          </span>
        )}
      </div>

      <h2 className="mt-2 text-[length:var(--text-2xl)] font-semibold leading-tight tracking-[-0.02em] break-words">
        {task.title}
      </h2>

      {/* Hedef bağı: "bu iş neye hizmet ediyor" sorusunun cevabı. Koçun
          en temel katkısı — görevi bir bağlama oturtmak. */}
      {goal && (
        <p className="mt-2 flex items-center gap-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: SLOT_HEX[goal.colorSlot] }}
          />
          <span className="min-w-0 truncate">{goal.title}</span>
        </p>
      )}

      {/*
        Gecikme SUÇLAMADAN söylenir: tarih yazılır, yorum yazılmaz.
        "Bunu dün yapmalıydın" demek kullanıcıyı savunmaya iter;
        "18 Ağustos'tan taşındı" sadece gerçeği söyler.
      */}
      {overdue && task.dueDate && (
        <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-warn)]">
          {formatShortDate(task.dueDate)} tarihinden taşındı
        </p>
      )}

      {task.note && (
        <p className="mt-2 text-[length:var(--text-sm)] leading-relaxed text-[var(--color-ink-3)]">
          {task.note}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onDone}
          className={cn(
            "inline-flex h-10 items-center rounded-lg px-4",
            "text-[length:var(--text-sm)] font-medium",
            "bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]",
            "transition-shadow duration-[var(--duration-fast)]",
            "hover:shadow-[var(--glow-accent-md)]",
          )}
        >
          Bitti
        </button>

        {/* Zen İKİNCİL: "bitir" birincil eylem, "odaklan" ona giden
            yol. Tersi olsaydı kart her açılışta bir mod değişimi
            teklif ederdi. */}
        {zen && (
          <button
            type="button"
            onClick={() => zen.enter(task)}
            className={cn(
              "inline-flex h-10 items-center rounded-lg px-4",
              "border border-[var(--color-line-2)]",
              "text-[length:var(--text-sm)] text-[var(--color-ink-2)]",
              "transition-colors duration-[var(--duration-fast)]",
              "hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]",
            )}
          >
            Odaklan
          </button>
        )}
      </div>
    </section>
  );
}
