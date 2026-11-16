"use client";

import { Chevron } from "@/components/Chevron";
import { isoWeekday } from "@/lib/date/date";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatShortDate, WEEKDAYS_LONG } from "@/lib/ui/tr";
import { TaskQuickAdd } from "@/features/tasks/TaskQuickAdd";
import type { Task } from "@/features/tasks/types";
import { DayLoad } from "@/features/tasks/DayLoad";
import { DayStudentBar } from "@/features/coachview/DayStudentBar";
import { CatalogAddButton } from "@/features/sources/CatalogPanel";
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
  /**
   * Bir şey bu güne SÜRÜKLENİYOR mu (Faz 6)?
   *
   * `placing`'den ayrı: sürükleme kipinde tıkla-yerleştir şeridi de
   * gösteriliyor ama vurgu sürüklenen satırın üstündeyken değişmeli.
   */
  dragOver?: boolean;
  /** Sürükleme bırakıldığında (Faz 6); verilmezse gün hedef olmaz. */
  onDrop?: (date: DateStr) => void;
  onDragOver?: (date: DateStr | null) => void;
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
  onUnschedule: (task: Task) => void;
  onSetEstimate: (task: Task, minutes: number | null) => void;
  onSetNote: (task: Task, note: string | null) => void;
  onReorder: (dayTasks: readonly Task[], task: Task, delta: -1 | 1) => void;
  onReorderTo?: (dayTasks: readonly Task[], task: Task, to: number) => void;
  /** Taşınmak üzere seçili görev (bkz. PlanTaskList). */
  movingId?: string | null;
  onMove?: (task: Task) => void;
  onDragTaskStart?: (task: Task) => void;
  onDragTaskEnd?: () => void;
}

export function PlanDayRow({
  bucket,
  today,
  hasPlan,
  categoryById,
  placing,
  dragOver = false,
  onDrop,
  onDragOver,
  addPending,
  inScope,
  collapsed: collapsedProp,
  onToggleCollapsed,
  onOpenDay,
  onPlace,
  onAdd,
  onToggle,
  onDelete,
  onRename,
  onUnschedule,
  onSetEstimate,
  onSetNote,
  onReorder,
  onReorderTo,
  movingId,
  onMove,
  onDragTaskStart,
  onDragTaskEnd,
}: PlanDayRowProps) {
  const weekday = isoWeekday(bucket.date);
  const weekdayLabel = WEEKDAYS_LONG[weekday];
  const isToday = bucket.date === today;
  const isPast = inScope && bucket.date < today;
  /* 6 = Cumartesi, 7 = Pazar (ISO). Kağıt ajandalarda hafta sonu farklı
   * tonda basılır; ayın nerede bölündüğünü gösteren ritim budur. */
  const isWeekend = weekday >= 6;
  const isEmpty = bucket.tasks.length === 0;
  /*
   * Boş gün KATLANMAZ: katlanacak görev yok, katlama oku da çizilmiyor
   * ve katlı sayılsaydı ekleme kutusu gizlenip güne iş eklemenin yolu
   * kalmazdı. Varsayılan kural geçmiş ve ileri günleri katlı getirdiği
   * için (foldrule.ts) bu durum artık sık.
   */
  const collapsed = collapsedProp && !isEmpty;

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

  /* Kart başlığı: "Pazartesi · 16 Kasım". Gün numarası ayrı sütunda
   * değil, okunan bir başlık — günler kart kart ayrışsın. */
  const gutterInner = (
    <>
      <span className="planDayTitle">
        <span className="planDayWeekday">{weekdayLabel}</span>
        <span aria-hidden> · </span>
        <span className="planDayNum tabular">{dayName}</span>
      </span>
      {bucket.openCount > 0 && (
        <span aria-hidden className="planDayCount tabular">
          {bucket.openCount} iş
        </span>
      )}
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
        collapsed && "planDayRowCollapsed",
        placing && "planDayRowTarget",
        dragOver && "planDayRowTarget",
      )}
      /*
       * HTML5 yerel sürükle-bırak — İKİNCİL yol.
       *
       * `onDragOver`'da `preventDefault()` şart: olmadan tarayıcı
       * bırakmayı reddeder. Dokunmada çalışmaz ve bu KABUL EDİLEBİLİR,
       * çünkü tıkla-yerleştir yolu (yukarıdaki `placing` şeridi)
       * dokunmayı ve klavyeyi zaten tam kapsıyor. Sürükleme
       * kaldırılsa hiçbir akış kaybolmaz — gerekçe PlanNodePanel'de.
       */
      onDragOver={
        onDrop &&
        ((event) => {
          event.preventDefault();
          onDragOver?.(bucket.date);
        })
      }
      onDragLeave={onDrop && (() => onDragOver?.(null))}
      onDrop={
        onDrop &&
        ((event) => {
          event.preventDefault();
          onDragOver?.(null);
          onDrop(bucket.date);
        })
      }
    >
      {/*
        Tarih kanalı. Gün paneli varsa bir düğmedir.

        Satırın TAMAMI tıklanabilir yapılamaz: içinde checkbox, metin
        girdisi ve simge düğmeleri var; hepsini saran bir hedef onları
        yutar, iç içe interaktif eleman hem geçersiz HTML hem klavye
        erişilemez olurdu.
      */}
      <div className="planDayHead">
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

        <div className="planDayHeadSide">
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
              {/* Açık iş sayısı başlıktaki rozette; yazı yalnızca gün bitince. */}
              {collapsed && bucket.openCount === 0 && (
                <span aria-hidden className="tabular">
                  {summary}
                </span>
              )}
              <Chevron open={!collapsed} />
            </button>
          )}
          <DayLoad tasks={bucket.tasks} compact />
        </div>
      </div>

      <div className="planDayField">
        {/* Öğrencinin günlük formu + koç notu (sağlayıcı yoksa boş). */}
        {inScope && <DayStudentBar date={bucket.date} />}

        {!collapsed && (
          <PlanTaskList
            tasks={bucket.tasks}
            today={today}
            categoryById={categoryById}
            className="planDayTasks"
            onToggle={onToggle}
            onDelete={onDelete}
            onRename={onRename}
            onUnschedule={onUnschedule}
            onSetEstimate={onSetEstimate}
            onSetNote={onSetNote}
            onReorder={onReorder}
            onReorderTo={onReorderTo}
            movingId={movingId}
            onMove={onMove}
            onDragTaskStart={onDragTaskStart}
            onDragTaskEnd={onDragTaskEnd}
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
            <div className="flex items-start gap-1">
              <div className="min-w-0 flex-1">
                <TaskQuickAdd
                  dueDate={bucket.date}
                  pending={addPending}
                  onAdd={(title) => onAdd(title, bucket.date)}
                />
              </div>
              <CatalogAddButton date={bucket.date} className="mt-0.5" />
            </div>
          )
        )}
      </div>
    </section>
  );
}
