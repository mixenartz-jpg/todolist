"use client";

import type { DateStr } from "@/lib/date/types";
import { DayNoteCard } from "@/features/notes/DayNoteCard";
import { formatDuration } from "@/features/tasks/schedule";
import type { DayClose } from "./daysummary";

/**
 * Gün özeti — rayın son bloğu.
 *
 * İki parça: ÜSTTE bugün ne olduğunun türetilmiş özeti, ALTTA gün notu
 * ve mood. Sıra bilinçli: "nasıl geçti" diye sormadan önce ne olduğunu
 * göstermek, kullanıcının boş bir kutuya bakıp günü hatırlamaya
 * çalışmasını engeller.
 *
 * `DayNoteCard` DEĞİŞTİRİLMEDEN gömülüyor — Bugün ekranının altından
 * buraya taşındı, davranışı aynı. `DayPlanEditor` ile aynı sorgu
 * anahtarını (`qk.note`) paylaşmasının neden güvenli olduğu
 * `DayRail.tsx`'te yazılı.
 */
export function DayCloseCard({
  date,
  close,
  onError,
}: {
  date: DateStr;
  close: DayClose;
  onError?: (message: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <DaySummaryLines close={close} />
      <DayNoteCard date={date} onError={onError} />
    </div>
  );
}

/**
 * Türetilmiş sayılar.
 *
 * Hiçbir satır KOŞULSUZ çizilmez: yapılacak işi olmayan bir günde
 * "0/0 görev" göstermek bilgi değil gürültüdür. Hepsi boşsa blok
 * tamamen kaybolur ve altındaki not alanı yukarı gelir.
 */
function DaySummaryLines({ close }: { close: DayClose }) {
  const lines: Array<{ label: string; value: string }> = [];

  if (close.routines.total > 0) {
    lines.push({
      label: "Rutin",
      value: `${close.routines.done}/${close.routines.total}`,
    });
  }

  if (close.tasks.total > 0) {
    lines.push({
      label: "Görev",
      value: `${close.tasks.done}/${close.tasks.total}`,
    });
  }

  /*
   * "Planlanan" sözcüğü ŞART: bu sayı tamamlanmış saatli görevlerin
   * planlanan süresidir, kronometreyle ölçülmüş çalışma değil. Sadece
   * "Çalışma" yazmak, uygulamanın bilmediği bir şeyi biliyormuş gibi
   * göstermek olurdu (bkz. daysummary.ts).
   */
  if (close.minutes > 0) {
    lines.push({
      label: "Planlanan",
      value: formatDuration(close.minutes),
    });
  }

  if (close.reviews.due > 0) {
    lines.push({
      label: "Bekleyen tekrar",
      value: String(close.reviews.due),
    });
  }

  if (lines.length === 0) return null;

  return (
    <dl className="flex flex-col gap-1">
      {lines.map((line) => (
        <div key={line.label} className="flex items-baseline gap-2">
          <dt className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {line.label}
          </dt>
          <dd className="tabular ml-auto text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {line.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
