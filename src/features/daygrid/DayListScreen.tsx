"use client";

import { useMemo, useSyncExternalStore } from "react";
import { isoWeekday } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { slotVar } from "@/lib/ui/colors";
import { formatShortDate, WEEKDAYS_SHORT } from "@/lib/ui/tr";
import { TaskItem } from "@/features/tasks/TaskItem";
import type { Task } from "@/features/tasks/types";
import { orderForList } from "./listorder";

/**
 * Liste görünümünün yazma eylemleri.
 *
 * `TaskItem`'ın beklediği imzalarla birebir: bileşen içinde sarmalayıcı
 * kapanış (closure) kurulmasın diye görev PARAMETRE olarak geçiyor —
 * aksi halde her satır için her render'da yeni fonksiyonlar üretilir ve
 * `TaskItem`'ın `memo`'su hiçbir zaman tutmazdı.
 */
export interface DayListActions {
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDefer: (task: Task) => void;
  onRename: (task: Task, title: string) => void;
  onSetTime: (
    task: Task,
    startTime: string | null,
    durationMinutes: number | null,
  ) => void;
}

interface DayListScreenProps {
  dates: readonly DateStr[];
  today: DateStr;
  /** Görünen aralığa tarihlenen görevler (tamamı — saatli + saatsiz). */
  tasks: readonly Task[];
  colorOf: (task: Task) => number | null;
  actions: DayListActions;
}

/**
 * Izgaranın liste karşılığı: günün işleri düz bir kutucuk listesi.
 *
 * ── Neden var? ──
 * Izgara her işin bir SAATE düşürülmesini ister; oysa günün işlerinin
 * çoğunun saati yok ve onlar şu an ızgaranın üstündeki dar "Saatsiz"
 * şeridine sıkışıyor. Liste, aynı günü "yapılacaklar" olarak okumanın
 * yolu — ızgaranın yerine değil, YANINA konan ikinci bir okuma biçimi.
 *
 * ── Neden yeni bir satır bileşeni yok? ──
 * `TaskItem` zaten tam bu iş için var ve Bugün ekranının "Taşınanlar"
 * ile "Bir ara" bölümlerinde bu ekranda ZATEN kullanılıyor: kutucuk,
 * ad düzenleme, saat/süre paneli, erteleme ve silme hepsi içinde.
 * İkinci bir satır çizmek, aynı davranışı iki yerde ayrı ayrı
 * sürdürmek olurdu — biri düzeltilip diğeri unutulurdu.
 *
 * ── Neden sürükle-bırak yok? ──
 * Sürükleme ızgarada bir SAAT söyler (dikey eksen = zaman). Listede
 * dikey eksen sıradan ibaret; bir satırı yukarı çekmek hiçbir saate
 * denk gelmez. Saat vermek `TaskItem`'ın mevcut saat panelinden geçer.
 *
 * ── Neden panel (`TaskPopover`) açılmıyor? ──
 * Panelin sunduğu her şeyin (ad, saat, silme) satırda zaten bir
 * karşılığı var. Aynı işi iki kapıdan yapmak, kullanıcıya hangi kapının
 * "asıl" olduğunu sorgulatır. Panel ızgaranın çözümü: orada blok
 * küçücük ve içine kontrol sığmıyor.
 */
export function DayListScreen({
  dates,
  today,
  tasks,
  colorOf,
  actions,
}: DayListScreenProps) {
  /*
   * Gün → o güne tarihli görevler, her biri kendi içinde sıralı.
   *
   * Sıralama `orderForList`'te, burada değil: saf ve test edilebilir
   * kalması gerekiyor (bkz. listorder.ts) — bu dosyada React Testing
   * Library olmadığı için test edilemezdi.
   */
  const byDate = useMemo(() => {
    const map = new Map<DateStr, Task[]>();
    for (const date of dates) map.set(date, []);
    for (const task of tasks) {
      if (task.dueDate === null) continue;
      map.get(task.dueDate)?.push(task);
    }
    for (const [date, list] of map) map.set(date, orderForList(list));
    return map;
  }, [dates, tasks]);

  /*
   * Tarih başlığı YALNIZCA çok günlü görünümde.
   *
   * Tek gün gösterilirken hangi güne baktığı ekranın başlığında zaten
   * yazıyor; bir de listenin üstünde tekrarlamak aynı bilgiyi iki kez
   * göstermek olur (`UntimedStrip`'in "tek grup varken etiket
   * gürültüdür" kuralıyla aynı gerekçe).
   */
  const showDayHeadings = dates.length > 1;

  /*
   * Dar ekranda satır `compact`: eylem simgeleri başlığın YANINDAN
   * ALTINA iner.
   *
   * Ölçüldü (375px): satır 343px, simge kümesi 100px'i kalıcı olarak
   * tutuyor (dokunmatikte `revealTarget` hep görünür — bkz.
   * list-motion.css) ve geriye kalan 153px'i saat (36px) ile süre
   * (23px) çipleri de paylaşınca başlığa 63px kalıyordu: "Orijinal TYT
   * Matemat / ik deneme..." diye kelime ortasından bölünen dokuz
   * satırlık bir blok. `compact` başlığa sütunun tamamını bırakır.
   *
   * `PlanTaskList` bu bayrağı GEÇMİYOR ve gerekçesi orada yazılı:
   * onun sütunu en dar hâlinde ~280px ve simgeler yanda kalabiliyor.
   * Buradaki liste ise telefonda tam genişlikte tek sütun — aynı
   * kararın burada karşılığı yok.
   */
  const narrow = useIsNarrow();

  return (
    <div className="flex flex-col gap-[var(--stack-gap)]">
      {dates.map((date) => {
        const dayTasks = byDate.get(date) ?? [];

        /*
         * Tek günlük görünümde boş gün hiçbir şey çizmez: ekleme kutusu
         * zaten hemen altında ve "bugün için görev yok" demek, kullanıcı
         * o kutuyu görürken gereksiz bir cümle. Çok günlü görünümde ise
         * boş bir günün sessizce kaybolması, haftanın o gününün hiç
         * olmadığı izlenimi verirdi.
         */
        if (dayTasks.length === 0 && !showDayHeadings) return null;

        return (
          <section key={date}>
            {showDayHeadings && (
              <h3
                className={cn(
                  "mb-1.5 flex items-baseline gap-1.5 text-[length:var(--text-sm)]",
                  date === today
                    ? "font-medium text-[var(--color-ink)]"
                    : "text-[var(--color-ink-3)]",
                )}
              >
                <span>{WEEKDAYS_SHORT[isoWeekday(date)]}</span>
                <span className="tabular">{formatShortDate(date)}</span>
              </h3>
            )}

            {dayTasks.length === 0 ? (
              <p className="text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
                Görev yok
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {dayTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    today={today}
                    marker={<ColorDot slot={colorOf(task)} />}
                    onToggle={() => actions.onToggle(task)}
                    onDelete={() => actions.onDelete(task)}
                    onDefer={() => actions.onDefer(task)}
                    onRename={(title) => actions.onRename(task, title)}
                    onSetTime={(startTime, durationMinutes) =>
                      actions.onSetTime(task, startTime, durationMinutes)
                    }
                    compact={narrow}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Görevin renk noktası.
 *
 * `CategoryDot` DEĞİL: o bir KATEGORİ nesnesi ister, oysa buradaki renk
 * `taskColorSlot` ile çözülmüş olabilir — görevin kendi rengi kategori
 * rengini ezebiliyor (bkz. tasks/color.ts) ve o durumda elde bir
 * kategori nesnesi yok. Izgaradaki blokların renk şeridiyle aynı
 * kaynaktan besleniyor.
 *
 * Rengi olmayan görev nokta ÇİZMEZ: nötr gri bir nokta, "rengi yok"
 * demek yerine "gri kategoriye ait" gibi okunurdu.
 */
function ColorDot({ slot }: { slot: number | null }) {
  if (slot === null) return null;

  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ background: slotVar(slot) }}
    />
  );
}

const NARROW_QUERY = "(max-width: 767px)";

/**
 * Dar ekran mı?
 *
 * `TaskPopover`'ın `useIsSheet`i ve `useDayGridSurface`'ın
 * `useWideViewport`ü ile AYNI desen, aynı gerekçe: `matchMedia`
 * dinlenir, `resize` değil — tarayıcı eşiği geçtiğinde zaten haber
 * veriyor.
 *
 * Saf CSS yetmez: `compact` satırın DOM SIRASINI değiştiriyor
 * (`order-1/2/3`) ve hangi dolgunun uygulanacağını seçiyor; bir medya
 * sorgusuyla iki farklı sınıf kümesini `TaskItem`'ın içinden geçirmek,
 * o bileşeni bu ekranın düzenine bağlardı.
 *
 * Sunucu anlık görüntüsü `false` (geniş): sunucuda viewport bilinemez
 * ve hydration uyuşmazlığı riski alınmaz — ilk boyamada simgeler yanda
 * çizilir, eşleşme sonrası doğru düzene geçer.
 */
function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribeToNarrow, getNarrowSnapshot, () => false);
}

function subscribeToNarrow(onChange: () => void): () => void {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getNarrowSnapshot(): boolean {
  return window.matchMedia(NARROW_QUERY).matches;
}
