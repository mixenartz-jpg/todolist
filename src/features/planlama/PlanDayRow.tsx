"use client";

import { Chevron } from "@/components/Chevron";
import { isoWeekday, toParts } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatShortDate, WEEKDAYS_SHORT } from "@/lib/ui/tr";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import type { Task } from "@/features/tasks/types";
import { PlanTaskList } from "./PlanTaskList";
import type { PlanBucket } from "./range";
import type { Category } from "./types";
import "./planlama.css";

/*
 * Ajanda kağıdının tek gün satırı — ay ve hafta ölçeğinin ORTAK kabı.
 *
 * ── Neden artık tek bileşen? ──
 * `PlanMonthDay` ve `PlanDayColumn` ayrı duruyordu ve gerekçesi
 * `PlanTaskList` yorumunda yazılıydı: "hafta sütunu içeriği kadar
 * uzar, ay kutusu sabit boydadır ve içinde kaydırılır". Ay kutusunun
 * sabit boyu ve iç kaydırıcısı kalktığı için o ayrımın sebebi
 * ortadan kalktı — ikisi de artık içeriğe göre uzayan bir satır.
 *
 * ── Yerleşim ──
 *   ┌────────┬──────────────────────────────────────┐
 *   │  12    │ ☐ Matematik      ☐ Fizik deneme      │
 *   │  Pzt   │ ☐ İngilizce 40   ☐ Kimya konu        │
 *   │  6 iş  │ ＋ ekle…                              │
 *   └────────┴──────────────────────────────────────┘
 *
 * Sol kanal SABİT genişlikte (`--plan-gutter`). Bu, kağıt ajandanın
 * tarama hızını veren şey: tarihler bütün ay boyunca TEK DİKEY HATTA
 * hizalanır ve göz aşağı kayarken hiç kaymaz.
 *
 * ── Yükseklik ──
 * Boş gün `--plan-row-min` (ince şerit), dolu gün içeriği kadar uzar.
 * İÇ KAYDIRMA YOK: hiçbir görev gizlenmez. Ayın ~%60'ı boş olduğu için
 * tipik bir ay eski 6×20rem yerleşiminden KISA sürer.
 */

interface PlanDayRowProps {
  bucket: PlanBucket;
  today: DateStr;
  /** Günün serbest plan metni yazılmış mı — kanaldaki nokta. */
  hasPlan: boolean;
  categoryById: ReadonlyMap<string, Category>;
  /** Havuzdan seçili görev varsa satır yerleştirme hedefi olur. */
  placing: boolean;
  addPending: boolean;
  /**
   * Ay ölçeğinde komşu ay günleri kapsam dışıdır ve solar.
   * Hafta ölçeğinde daima `true`.
   */
  inScope: boolean;
  /**
   * Gün panelini açar. Verilmezse tarih kanalı `<button>` değil düz
   * bir blok olur — hafta ölçeğinde gün paneli yok ve orada sahte bir
   * düğme klavye kullanıcısına anlamsız bir durak olurdu.
   */
  onOpenDay?: (date: DateStr) => void;
  /**
   * Gün katlanmış mı — görev listesi gizli, yalnızca özet görünür.
   *
   * Durum EKRANDA tutulur, burada değil: bir ay 42 satır çiziyor ve
   * her satırın kendi `useState`'i olsaydı ay değiştirildiğinde
   * hepsi sıfırlanırdı. Ayrıca "hepsini kapat" gibi bir eylem asla
   * yazılamazdı.
   */
  collapsed: boolean;
  onToggleCollapsed: (date: DateStr) => void;
  onPlace: (date: DateStr) => void;
  onAdd: (title: string, date: DateStr) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRename: (task: Task, title: string) => void;
  onSetTime: (
    task: Task,
    startTime: string | null,
    durationMinutes: number | null,
  ) => void;
  onUnschedule: (task: Task) => void;
  onReorder: (dayTasks: readonly Task[], task: Task, delta: -1 | 1) => void;
}

export function PlanDayRow({
  bucket,
  today,
  hasPlan,
  categoryById,
  placing,
  addPending,
  inScope,
  collapsed,
  onToggleCollapsed,
  onOpenDay,
  onPlace,
  onAdd,
  onToggle,
  onDelete,
  onRename,
  onSetTime,
  onUnschedule,
  onReorder,
}: PlanDayRowProps) {
  const day = toParts(bucket.date).day;
  const weekday = isoWeekday(bucket.date);
  const weekdayLabel = WEEKDAYS_SHORT[weekday];
  const isToday = bucket.date === today;
  const isPast = inScope && bucket.date < today;
  /* 6 = Cumartesi, 7 = Pazar (ISO). Kağıt ajandalarda hafta sonu farklı
   * tonda basılır; ayın nerede bölündüğünü gösteren ritim budur. */
  const isWeekend = weekday >= 6;
  const isEmpty = bucket.tasks.length === 0;

  // Yıl DEĞİL "5 Ağustos": yıl zaten başlıkta ve her satırda tekrar
  // etmek ekran okuyucuyu boğardı.
  const dayName = formatShortDate(bucket.date);

  /* Etiket sayıyı KELİMEYLE söyler: rakamlar yan yana okunduğunda
   * hangisinin gün, hangisinin iş sayısı olduğu belli olmazdı. */
  const openLabel = [
    `${dayName}: günü aç`,
    bucket.openCount > 0 ? `${bucket.openCount} iş` : "iş yok",
    hasPlan ? "planlı" : null,
    isToday ? "bugün" : null,
  ]
    .filter(Boolean)
    .join(", ");

  /*
   * Katlı satırın özeti.
   *
   * Kanaldaki sayaçla AYNI dili konuşur: ikisi de AÇIK işi sayar.
   * `bucket.tasks.length` (toplam) kullanılsaydı, altı görevi de
   * bitmiş bir gün kapalıyken "6 görev" derdi ve o günün bittiği
   * görünmezdi — üstelik kanaldaki sayaç aynı satırda hiç
   * görünmezken (sıfırda gizleniyor) iki sayı çelişirdi.
   *
   * Hepsi bittiğinde sayı değil DURUM söylenir: "6 görev" demek
   * yapılacak iş varmış gibi okunurdu.
   */
  const summary =
    bucket.openCount > 0 ? `${bucket.openCount} açık iş` : "tamamlandı";

  const gutterInner = (
    <>
      <span className="planDayNum tabular">{day}</span>
      <span className="planDayWeekday">{weekdayLabel}</span>
      {bucket.openCount > 0 && (
        <span aria-hidden className="planDayCount tabular">
          {bucket.openCount}
        </span>
      )}
      {/* Plan noktası sayaçtan AYRI bir işaret: planı yazılmış ama işi
          olmayan bir gün de "dolu"dur ve bunu sayı gösteremezdi. */}
      {hasPlan && <span aria-hidden className="planDayDot" />}
    </>
  );

  return (
    <section
      aria-label={dayName}
      className={cn(
        "planDayRow",
        isToday && "planDayRowToday",
        isPast && "planDayRowPast",
        isWeekend && "planDayRowWeekend",
        !inScope && "planDayRowOutside",
        isEmpty && "planDayRowEmpty",
        // `!isEmpty` şart: boş günde katlanacak bir şey yok ve
        // `collapsed` bayrağı orada anlamsız kalır.
        collapsed && !isEmpty && "planDayRowCollapsed",
        placing && "planDayRowTarget",
      )}
    >
      {/*
        Tarih kanalı. Gün paneli varsa bir düğmedir.

        Satırın TAMAMI tıklanabilir yapılamaz: içinde checkbox, metin
        girdisi ve simge düğmeleri var; hepsini saran bir hedef onları
        yutar, iç içe interaktif eleman hem geçersiz HTML hem klavye
        erişilemez olurdu.
      */}
      {onOpenDay ? (
        <button
          type="button"
          aria-label={openLabel}
          onClick={() => onOpenDay(bucket.date)}
          className="planDayGutter planDayGutterButton"
        >
          {gutterInner}
        </button>
      ) : (
        <div className="planDayGutter">{gutterInner}</div>
      )}

      <div className="planDayField">
        {/*
          Katlama oku — YALNIZCA görevi olan günde.
          Boş bir günde katlanacak bir şey yok ve ok "burada gizli
          bir şey var" diye yalan söylerdi.

          Tarih kanalına konulamaz: orası zaten gün panelini açan bir
          düğme ve aynı hedefe iki işlev bindirmek, hangisinin
          olacağını tahmin edilemez kılardı.
        */}
        {!isEmpty && (
          <button
            type="button"
            onClick={() => onToggleCollapsed(bucket.date)}
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? `${dayName}: ${summary} göster` : `${dayName}: görevleri gizle`
            }
            className="planDayCollapse"
          >
            <Chevron open={!collapsed} />
            {/* Kapalıyken özet görünür: satır "boş" sanılmasın.
                Açıkken gereksiz — görevler zaten ortada. */}
            {collapsed && (
              <span aria-hidden className="tabular">
                {summary}
              </span>
            )}
          </button>
        )}

        {!collapsed && (
          <PlanTaskList
            tasks={bucket.tasks}
            today={today}
            categoryById={categoryById}
            className="planDayTasks"
            onToggle={onToggle}
            onDelete={onDelete}
            onRename={onRename}
            onSetTime={onSetTime}
            onUnschedule={onUnschedule}
            onReorder={onReorder}
          />
        )}

        {/*
          Yerleştirme modunda ekleme kutusu YERİNE geniş bırakma şeridi.

          Önceki sürüm her kutuya ayrı küçük bir "12'e koy" düğmesi
          koyuyordu — ayda 42 düğme. Geniş satırda bir gün = BİR hedef;
          şerit görev alanının tamamını kaplar ve nişan alması kolaydır.

          İkisi aynı anda gösterilmez: aynı yerde iki farklı "buraya
          ekle" hedefi belirsizlik olurdu.
        */}
        {placing ? (
          /* Yerleştirme hedefi KATLI günde de görünür: kapalı bir güne
             iş atmak isteyebilirsin ve şeridi gizlemek o günü hedef
             olmaktan çıkarırdı. */
          <button
            type="button"
            aria-label={`${dayName} gününe koy`}
            onClick={() => onPlace(bucket.date)}
            className="planDropStrip"
          >
            <span aria-hidden>＋ {dayName} gününe koy</span>
          </button>
        ) : (
          /* Katlıyken ekleme kutusu da gizlenir — yoksa "kapalı" bir
             gün yine 36px yer kaplar ve katlamanın anlamı kalmazdı. */
          !collapsed && (
            <TaskQuickAdd
              dueDate={bucket.date}
              pending={addPending}
              onAdd={(title) => onAdd(title, bucket.date)}
            />
          )
        )}
      </div>
    </section>
  );
}
