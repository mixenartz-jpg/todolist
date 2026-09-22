"use client";

import Link from "next/link";
import type { DateStr } from "@/lib/date/types";
import { DayNoteCard } from "@/features/notes/DayNoteCard";
import { dayLine } from "@/features/coach/messages";
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

      {/*
        Koçluk satırı AYRI bir grup olarak ekleniyor, `DayClose`
        genişletilerek değil: `daysummary.ts` `score` alanını bilerek
        dışlıyor ("ikinci kopya = iki bağımsız doğruluk kaynağı") ve
        cümle de aynı sebeple ayrı bir modülden (`coach/messages.ts`)
        geliyor. Burası onu yalnızca OKUYOR.
      */}
      <CoachNote close={close} />

      <DayNoteCard date={date} onError={onError} />

      {/* Arşiv artık ana sekme ama bu kısayol KALIYOR: günü kapatan
          kişi "daha önce ne yaptım"a en yakın olan kişidir ve o anda
          alt çubuğa gitmesini beklemek bağlamı koparırdı. Sekme bir
          yer, bu bir akış. */}
      <Link
        href="/arsiv"
        className="text-[length:var(--text-xs)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-accent)]"
      >
        Arşive git
      </Link>
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

/**
 * Günün tek cümlesi.
 *
 * Sayılar yukarıda zaten var; bu satır onlara YORUM ekliyor — "3/6"
 * bir ölçü, "3 iş kaldı" bir sonraki adım. Koçluğun ilk kuralı: sayı
 * tek başına yetmez.
 *
 * Eylem düğmesi ÇİZİLMİYOR: bu blok zaten Bugün ekranının içinde ve
 * "Bugüne git" düğmesi kullanıcıyı bulunduğu yere göndermek olurdu.
 */
function CoachNote({ close }: { close: DayClose }) {
  const line = dayLine(close);

  return (
    <p className="text-[length:var(--text-xs)] leading-relaxed text-[var(--color-ink-3)]">
      {line.detail ?? line.headline}
    </p>
  );
}
