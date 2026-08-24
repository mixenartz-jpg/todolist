"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { DateStr } from "@/lib/date/types";
import { formatTime } from "@/features/tasks/schedule";
import type { Task } from "@/features/tasks/types";
import { DayGridCanvas, DayGridHeadings } from "./DayGridCanvas";
import {
  resolveDrop,
  type DragResult,
  type DropIntent,
  type OpenTaskHandler,
} from "./drop";
import { DEFAULT_DURATION } from "./geometry";
import { UntimedStrip } from "./UntimedStrip";

export interface DraftSlot {
  date: DateStr;
  startMinute: number;
}

interface DayGridScreenProps {
  dates: readonly DateStr[];
  today: DateStr;
  /** Görünen aralığa tarihlenen görevler (tamamı — saatli + saatsiz). */
  tasks: readonly Task[];
  colorOf: (task: Task) => number | null;
  /** Bloğa tıklandı — düzenleme yüzeyi çağıranda açılır. */
  onOpen: OpenTaskHandler;
  onCreate: (title: string, slot: DraftSlot) => void;
  /** Sürükleme bırakıldı — niyet çağıranda mutasyona dağıtılır. */
  onDrop: (intent: DropIntent) => void;
}

/**
 * Zaman ızgarasının gövdesi: saatsiz şerit + sütun başlıkları + tuval.
 *
 * Gezinme kontrolleri burada DEĞİL — onlar `DayGridHeader` ile ekran
 * başlığına giriyor (bkz. TodayScreen). Bu bileşen yalnızca çizelgeyi
 * çizer, böylece Bugün ekranının geri kalanı (rutinler, tekrar kuyruğu,
 * gün notu) ızgaranın altında bugünkü haliyle kalabilir.
 */
export function DayGridScreen({
  dates,
  today,
  tasks,
  colorOf,
  onOpen,
  onCreate,
  onDrop,
}: DayGridScreenProps) {
  const [draft, setDraft] = useState<DraftSlot | null>(null);
  const [expanded, setExpanded] = useState(false);
  const untimedRef = useRef<HTMLDivElement | null>(null);

  /*
   * Sürükleme sonucu burada NİYETE çevrilir, mutasyona değil: karar
   * saf bir fonksiyonda (resolveDrop) ve test edilebilir; dağıtım ise
   * çağıranda, çünkü mutasyon hook'ları oradaki `toast`'a bağlı.
   */
  const handleCommit = useCallback(
    (result: DragResult) => {
      const intent = resolveDrop(result);
      if (intent.kind !== "none") onDrop(intent);
    },
    [onDrop],
  );

  /*
   * Sürükleme başlatıcıları tuvalden gelir (metrik orada hesaplanıyor)
   * ama saatsiz şeritteki çipler de onlara ihtiyaç duyuyor. Ref'te
   * tutulur: state olsaydı tuvalin her metrik değişimi şeridi de
   * yeniden render ederdi.
   */
  const dragApi = useRef<{
    startMove: (task: Task, e: React.PointerEvent<HTMLElement>) => void;
    didDrag: () => boolean;
  } | null>(null);

  const handleDragReady = useCallback((api: NonNullable<typeof dragApi.current>) => {
    dragApi.current = api;
  }, []);

  const stripMoveStart = useCallback(
    (task: Task, e: React.PointerEvent<HTMLElement>) => {
      dragApi.current?.startMove(task, e);
    },
    [],
  );

  const stripDidDrag = useCallback(() => dragApi.current?.didDrag() ?? false, []);

  /*
   * Görevler güne göre kovalanır. Bu ızgara `tasksForDay`'i KULLANMAZ:
   * o fonksiyon geçmişten taşan tamamlanmamışları da o güne çeker ve
   * doğru olan davranış odur — ama bir zaman çizelgesinde taşan bir
   * görevin saati başka bir günün saatidir ve onu bugünün 09:00'ına
   * çizmek yalan olur. `week.ts`'in kovalama kuralıyla aynı hizada:
   * her sütun yalnızca kendi tarihini gösterir.
   */
  const { timedByDate, untimedByDate } = useMemo(() => {
    const timed = new Map<DateStr, Task[]>();
    const untimed = new Map<DateStr, Task[]>();

    for (const date of dates) {
      timed.set(date, []);
      untimed.set(date, []);
    }

    for (const task of tasks) {
      if (task.dueDate === null) continue;
      const bucket = task.startTime ? timed : untimed;
      bucket.get(task.dueDate)?.push(task);
    }

    return { timedByDate: timed, untimedByDate: untimed };
  }, [dates, tasks]);

  const handleEmptyClick = useCallback((date: DateStr, startMinute: number) => {
    setDraft({ date, startMinute });
  }, []);

  return (
    <div className="flex flex-col">
      <UntimedStrip
        ref={untimedRef}
        dates={dates}
        untimedByDate={untimedByDate}
        colorOf={colorOf}
        onOpen={onOpen}
        onMoveStart={stripMoveStart}
        didDrag={stripDidDrag}
      />

      <DayGridHeadings dates={dates} today={today} />

      <div className="relative">
        <DayGridCanvas
          dates={dates}
          today={today}
          tasksByDate={timedByDate}
          colorOf={colorOf}
          onOpen={onOpen}
          onEmptyClick={handleEmptyClick}
          expanded={expanded}
          untimedRef={untimedRef}
          onCommit={handleCommit}
          onDragReady={handleDragReady}
        />

        {draft && (
          <DraftPrompt
            slot={draft}
            onCancel={() => setDraft(null)}
            onSubmit={(title) => {
              setDraft(null);
              onCreate(title, draft);
            }}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="mt-1.5 self-start rounded-sm px-1 py-0.5 text-[length:var(--text-2xs)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-ink-2)]"
      >
        {expanded ? "Dolu saatleri göster" : "Tüm günü göster"}
      </button>
    </div>
  );
}

/**
 * Boş yuvaya tıklayınca açılan görev adı kutusu.
 *
 * Sheet DEĞİL, ızgaranın üstünde duran bir şerit: takvimde saat
 * seçmenin bütün değeri hangi saate koyduğunu GÖREREK yazmaktır, oysa
 * modal arkasındaki ızgarayı perdeyle kapatır ve kullanıcı yazarken
 * bağlamı kaybeder. `TaskQuickAdd` de "görev eklemek tek cümle
 * yazmaktır" diyor; modal o ilkeye ikinci bir kat eklerdi.
 */
function DraftPrompt({
  slot,
  onCancel,
  onSubmit,
}: {
  slot: DraftSlot;
  onCancel: () => void;
  onSubmit: (title: string) => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t border-[var(--color-line-2)] bg-[var(--color-surface-2)] px-2 py-2">
      <span className="tabular shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
        {formatTime(slot.startMinute)}
      </span>

      <input
        autoFocus
        maxLength={200}
        placeholder="Ne yapacaksın?"
        aria-label={`${formatTime(slot.startMinute)} için yeni görev`}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const value = e.currentTarget.value.trim();
            if (value.length > 0) onSubmit(value);
            else onCancel();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        /*
         * Blur İPTAL eder, kaydetmez.
         *
         * `TitleEditor`'dan bilinçli SAPMA: orada blur kaydeder çünkü
         * düzenlenen şey zaten var olan bir kayıttır ve en kötü ihtimalle
         * adı değişir. Burada blur bir kayıt YARATIRDI — ızgaranın
         * herhangi bir yerine tıklayan kullanıcı, yarım yazılmış bir
         * görevin sessizce kaydedilmesini beklemez.
         */
        onBlur={onCancel}
        className="min-w-0 flex-1 rounded-md bg-[var(--color-surface)] px-2 py-1 text-[length:var(--text-sm)] text-[var(--color-ink)] outline-none ring-1 ring-[var(--color-accent)]"
      />

      <span className="shrink-0 text-[length:var(--text-2xs)] text-[var(--color-ink-3)]">
        {DEFAULT_DURATION} dk
      </span>
    </div>
  );
}
