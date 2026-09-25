"use client";

import { memo, useRef, useState, type ReactNode } from "react";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatShortDate } from "@/lib/ui/tr";
import { EstimateChip, EstimatePicker } from "./EstimatePicker";
import { isPendingTask } from "./pending";
import { isOverdue } from "./queries";
import { normalizeTitleInput, shouldPersistTitle, TASK_TITLE_MAX } from "./rename";
import type { Task } from "./types";
import "@/components/list-motion.css";

interface TaskItemProps {
  task: Task;
  today: DateStr;
  onToggle: () => void;
  onDelete: () => void;
  /** Yarına ertele. Tarihsiz görevlerde gösterilmez. */
  onDefer?: () => void;
  /**
   * Ad düzenleme. Verilmezse başlık düz metin kalır.
   *
   * Çağrılmadan ÖNCE girdi doğrulanır (bkz. `rename.ts`): boş ya da
   * değişmemiş bir ad buraya hiç ulaşmaz.
   */
  onRename?: (title: string) => void;
  /**
   * Başlığın altında HER ZAMAN duran ek kontrol (ör. sıra düğmeleri,
   * kategori seçici).
   *
   * `panel`'den AYRI bir yuva: bu kalıcı, o bir düğmenin arkasında
   * açılıp kapanan bölme. İkisi birleştirilseydi sıra düğmeleri
   * panel açılmadan görünmez olurdu.
   */
  extra?: ReactNode;
  /**
   * Açılır bölme — yalnızca `expanded` iken çizilir (ör. hedef
   * seçici).
   *
   * Bölme satırın ALTINDA duruyor, yüzen bir panelde değil. Eskiden
   * bu iş `TaskPopover`'ındı: ızgara bloğunun yanına çapalanan,
   * dört kenarı deneyen kendi konumlandırma matematiği olan bir
   * panel. Bloklar gidince çapa da gitti; satırın altı hem daha
   * basit hem de kaydırmada yerinden oynamıyor.
   */
  panel?: ReactNode;
  /** Bölme açık mı? Durum ÇAĞIRANDA: aynı anda tek satır açılmalı. */
  expanded?: boolean;
  /**
   * Bölmeyi aç/kapat. Verilmezse açma düğmesi hiç çizilmez —
   * `panel` olmayan satırda basılacak bir şey olmamalı.
   */
  onExpand?: () => void;
  /**
   * Başlığın SOLUNDA duran küçük işaret (ör. kategori renk noktası).
   *
   * `extra`'dan ayrı bir yuva: o başlığın ALTINDA duran bir kontrol,
   * bu ise başlıkla aynı satırda duran bir işaret. Kategori noktası
   * `extra`ya konsaydı görev adının altında kendi satırını açar ve dar
   * sütunda her satırı bir kat daha uzatırdı.
   *
   * İçeriği `aria-hidden` olmalı: renk tek başına bilgi taşımaz ve
   * kategori adı `TaskItem`'ın dışında, satırın bağlamında zaten
   * okunur (bkz. CategoryDot).
   */
  marker?: ReactNode;
  /**
   * Tahmini süreyi ayarla (0023). Verilirse süre çipi tıklanabilir
   * olur ve tahmini olmayan satırda saat simgesi çizilir; verilmezse
   * çip yalnızca bir etikettir.
   */
  onSetEstimate?: (minutes: number | null) => void;
}

export const TaskItem = memo(function TaskItem({
  task,
  today,
  onToggle,
  onDelete,
  onDefer,
  onRename,
  extra,
  panel,
  expanded = false,
  onExpand,
  marker,
  onSetEstimate,
}: TaskItemProps) {
  const overdue = isOverdue(task, today);
  const [editingTitle, setEditingTitle] = useState(false);
  /*
   * Süre seçici açık mı? Durum SATIRDA, `expanded` gibi çağıranda
   * değil: seçici tek dokunuşla kapanıyor ve Planlama'nın dar
   * sütunlarında açılır bölme hiç yok — her çağıranın ayrı bir durum
   * tutması, süreyi yalnızca Bugün ekranında ayarlanabilir kılardı.
   */
  const [estimating, setEstimating] = useState(false);

  /*
   * Henüz yazılmamış görev ETKİLEŞİME KAPALI.
   *
   * Optimistic `useCreateTask` önbelleğe `tmp-` kimlikli bir satır koyar
   * ve o satır bu bileşende de görünür (tarihsiz "bir ara" ve taşınanlar
   * bölümleri doğrudan önbellekten okuyor). Geçici kimliğe yapılan her
   * yazma `.eq("id", "tmp-…")` ile SIFIR satır eşler: hata da vermez,
   * iş de görmez — kullanıcı işaretlediği kutucuğun bir saniye sonra
   * kendiliğinden geri döndüğünü görürdü.
   *
   * Kontrol satırın KENDİSİNDE: çağrı yerlerine bırakılsaydı, sözleşme
   * her yeni çağrı yerinde yeniden hatırlanmak zorunda kalırdı (bkz.
   * `isPendingTask`, mutations.ts).
   */
  const pending = isPendingTask(task.id);

  /*
   * Tamamlanmış görevin adı düzenlenmez. Üstü çizili bir metne tıklayınca
   * düzenleme kutusu açılması, işaretlemeyi geri almaya çalışan eli
   * yanlış yere götürür; bitmiş bir işin adını değiştirmek de nadir bir
   * ihtiyaçtır — kutucuğu geri alıp düzenlemek hâlâ mümkün.
   */
  const canRename = Boolean(onRename) && !task.done && !pending;

  return (
    <li
      aria-busy={pending || undefined}
      className={cn(
        "rowEnter revealOnHover flex rounded-xl border px-3 py-2.5",
        pending && "opacity-60",
        // `items-start`, `items-center` DEĞİL: başlık iki satıra
        // sarabiliyor ve ortalama, kutucuğu ile simgeleri metnin
        // ortasında asılı bırakırdı. Tepeden hizalanınca kutucuk her
        // zaman ilk satırın hizasında durur.
        "items-start gap-3",
        "transition-[color,background-color,border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
        /*
         * Üzerine gelince AÇIK satır ısınır.
         *
         * `--glow-card-hover` kenarlıkla BİRLİKTE yaşayan tek ışıma
         * (opaklığı bilerek düşük): satırın kenarı okunur kalıyor,
         * sıcaklık dışarıdan geliyor. Dolu bir ışıma burada "seçili"
         * demek olurdu ve satırın seçili diye bir durumu yok.
         *
         * BİTMİŞ satırda yok: tamamlanan iş geri plana çekilir ve onu
         * ısıtmak, dikkati yapılacak işten alınmış işe çevirirdi.
         */
        task.done
          ? "border-transparent bg-[var(--color-surface-2)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-2)] hover:shadow-[var(--glow-card-hover)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-pressed={task.done}
        aria-label={task.done ? `${task.title}: geri al` : `${task.title}: tamamla`}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg",
          "transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]",
          // `-mt-0.5`: satır tepeden hizalı (başlık sarabiliyor) ve
          // 40px'lik kutucuk ilk metin satırından bir tık yüksek
          // duruyordu.
          "-mt-0.5",
        )}
      >
        <span
          /* `key`: işaretlendiğinde eleman yeniden takılır ve onay
             animasyonu her seferinde yeniden oynar. Aksi halde CSS
             animasyonu yalnızca ilk boyamada çalışır. */
          key={task.done ? "done" : "todo"}
          className={cn(
            "grid size-[22px] place-items-center rounded-md transition-colors duration-[var(--duration-fast)]",
            task.done
              ? "markPop bg-[var(--color-ink-3)]"
              : "border-[1.5px] border-[var(--color-line-2)]",
          )}
        >
          {task.done && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M2.5 6.2l2.4 2.4L9.5 4"
                stroke="var(--color-surface)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        {/* Süre çipi başlık satırının SAĞINDA ama üstü çizili kabın
            DIŞINDA: `line-through` flex çocuklarına da yayılır ve
            bitmiş işin "30 dak"ı da çizilirdi. */}
        <div className="flex items-start gap-2">
        <div
          className={cn(
            "flex min-w-0 flex-1 gap-2 text-[length:var(--text-base)]",
            // Başlık artık her yerde sarabildiği için hiza da her yerde
            // tepeden: `items-baseline` sarmalı metinde tabanı SON
            // satıra göre hesaplar ve saat çipi metnin ortasında asılı
            // kalırdı.
            "items-start",
            task.done && "text-[var(--color-ink-3)] line-through",
          )}
        >
          {/* Kategori noktası saatin de solunda: satırın en başındaki
              sabit konum, göz taramasını kolaylaştırır. */}
          {marker && (
            <span
              // Nokta İLK satırın ortasına hizalanır. `self-center`
              // DEĞİL: iki satırlık bir başlıkta nokta iki satırın
              // arasına düşerdi. `items-start` altında da tepeye
              // yapışmaması için 0.4em aşağı itilir.
              className="mt-[0.4em] flex shrink-0"
            >
              {marker}
            </span>
          )}

          {editingTitle && onRename ? (
            <TitleEditor
              task={task}
              onClose={() => setEditingTitle(false)}
              onRename={onRename}
            />
          ) : canRename ? (
            <button
              type="button"
              title="Yeniden adlandır"
              onClick={() => setEditingTitle(true)}
              className={cn(
                "min-w-0 flex-1 cursor-text rounded-sm px-1 py-0.5 -mx-1 text-left",
                "transition-colors duration-[var(--duration-fast)]",
                "hover:bg-[var(--color-surface-2)]",
                /*
                 * Başlık HER ZAMAN sarar, asla kırpılmaz.
                 *
                 * "Orijinal TYT Matema..." hangi görev olduğunu
                 * söylemez; kullanıcı adı okuyamadığı bir işi
                 * planlayamaz. İki satır, yarım kelimeden iyidir.
                 *
                 * Bir zamanlar bu davranış `compact` bayrağına bağlıydı
                 * ve yalnızca dar sütunlarda açılıyordu — ama kırpma
                 * GENİŞ satırda da yanlış: uzun bir ad orada da
                 * sığmıyor, sadece daha geç kırpılıyor. Bayrak doğru
                 * davranışı isteğe bağlı kılıyordu; kendisi de artık
                 * yok (son çağıranı Takvim'in hafta sütunuydu).
                 *
                 * `wrap-anywhere` DEĞİL `break-words`: ilki kelimeyi
                 * ortadan böler ("Matemat / ik testi"), ikincisi önce
                 * kelime sınırını dener ve yalnızca satıra sığmayan tek
                 * bir kelimeyi zorlar.
                 */
                "break-words",
              )}
            >
              {task.title}
            </button>
          ) : (
            // Yeniden adlandırılamayan başlık — sarma kuralı aynı.
            <span className="min-w-0 flex-1 break-words">{task.title}</span>
          )}
        </div>

        {task.estimateMinutes !== null && (
          <span className="mt-0.5 flex">
            <EstimateChip
              minutes={task.estimateMinutes}
              done={task.done}
              taskTitle={task.title}
              onClick={
                onSetEstimate && !pending
                  ? () => setEstimating((open) => !open)
                  : undefined
              }
            />
          </span>
        )}
        </div>

        {estimating && onSetEstimate && (
          <EstimatePicker
            taskTitle={task.title}
            value={task.estimateMinutes}
            onChange={onSetEstimate}
            onClose={() => setEstimating(false)}
          />
        )}

        {extra}

        {/* Açılır bölme satırın altında, İÇERİDE: `<li>`nin dışına
            taşsaydı kenarlığın dışında asılı kalır ve hangi göreve
            ait olduğu kaybolurdu. */}
        {expanded && panel && <div className="mt-2">{panel}</div>}

        {overdue && task.dueDate && (
          <div className="mt-0.5 text-[length:var(--text-xs)] text-[var(--color-warn)]">
            {formatShortDate(task.dueDate)} tarihinden taşındı
          </div>
        )}

        {task.note && !task.done && (
          <div className="mt-0.5 truncate text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
            {task.note}
          </div>
        )}
      </div>

      <div
        className={cn(
          "revealTarget flex shrink-0 gap-0.5 transition-opacity duration-[var(--duration-fast)]",
          /* Bölme açıkken simgeler GÖRÜNÜR kalır: kullanıcı fareyi
             panele indirdiğinde satırdan çıkmış sayılır ve kapatma
             düğmesi altından kaybolurdu. */
          expanded || estimating ? "opacity-100" : "opacity-0",
        )}
      >
        {panel && onExpand && !pending && (
          <IconButton
            label={`${task.title}: hedef ve ayarlar`}
            pressed={expanded}
            onClick={onExpand}
          >
            {/* Nişan tahtası: "bu iş neye hizmet ediyor" sorusunun
                simgesi. Saat simgesinin yerini aldı — satırdaki eylem
                sayısı değişmedi, anlamı değişti. */}
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </IconButton>
        )}

        {/* Tahmini olmayan satırda süre vermenin yolu. Tahmin varsa
            çipin kendisi düğme — ikinci bir simge gereksiz olurdu. */}
        {onSetEstimate && task.estimateMinutes === null && !task.done && !pending && (
          <IconButton
            label={`${task.title}: tahmini süre ekle`}
            pressed={estimating}
            onClick={() => setEstimating((open) => !open)}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M8 5v3.2l2 1.3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
        )}

        {onDefer && !task.done && !pending && (
          <IconButton
            label={`${task.title}: yarına ertele`}
            onClick={onDefer}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8h8M8 5l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M13.5 3.5v9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </IconButton>
        )}

        {!pending && (
          <IconButton
            label={`${task.title}: sil`}
            onClick={onDelete}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3.5 4.5h9M6.5 4.5V3.2c0-.4.3-.7.7-.7h1.6c.4 0 .7.3.7.7v1.3M5 4.5l.5 8h5l.5-8"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
        )}
      </div>
    </li>
  );
});

/**
 * Görev adını yerinde düzenleme kutusu.
 *
 * `SectionHeading` ile AYNI dil: metnin kendisi hedeftir, ayrı bir
 * kalem simgesi yoktur. Satırdaki eylem kümesi zaten üçe kadar çıkıyor
 * (saat, taşı, sil); dördüncü bir simge dar hafta sütununa sığmazdı ve
 * "adı değiştir" için metne tıklamak zaten en kısa yol.
 *
 * Yanlışlar ekranındaki `RenameRow`'dan AYRILAN yer: orada blur
 * kaydetmez, çünkü tek onay N kaydı birden güncelliyor. Burada
 * düzenleme tek bir satırı etkiliyor ve geri alınabilir, o yüzden blur
 * kaydeder — kutuyu kapatmak için ayrıca Enter'a basmak gerekmez.
 */
function TitleEditor({
  task,
  onClose,
  onRename,
}: {
  task: Task;
  onClose: () => void;
  onRename: (title: string) => void;
}) {
  /** Esc'e basıldı mı? `onBlur`'un kaydetmesini engeller — bkz. onBlur. */
  const cancelledRef = useRef(false);

  function save(value: string) {
    onClose();

    const next = normalizeTitleInput(value);
    if (!shouldPersistTitle(task.title, next)) return;

    // `shouldPersistTitle` null'ı elemişti; tip daralması için gerekli.
    onRename(next as string);
  }

  return (
    <input
      autoFocus
      defaultValue={task.title}
      maxLength={TASK_TITLE_MAX}
      aria-label={`${task.title}: görev adı`}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => {
        /*
         * Esc ile kapatıldıysa KAYDETME.
         *
         * `onClose()` odağı eşzamanlı bırakmaz: React input'u sökerken
         * tarayıcı hâlâ odaktaki elemana bir `blur` gönderir ve bu,
         * kayıtlı `onBlur`'u çalıştırır. Yani "önce durumu kapat"
         * yeterli değildir — Esc, tam da iptal etmesi gereken yazıyı
         * kaydederdi. Bayrak bu sırayı kırar.
         */
        if (cancelledRef.current) {
          cancelledRef.current = false;
          return;
        }
        save(e.currentTarget.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          save(e.currentTarget.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelledRef.current = true;
          onClose();
        }
      }}
      /* Tipografi metinle AYNI: kutuya geçişte harfler yerinden
         oynarsa düzenleme bir "mod değişimi" gibi hissedilir, oysa
         yapılan şey aynı cümleyi yeniden yazmaktır. */
      className={cn(
        "min-w-0 flex-1 rounded-sm bg-[var(--color-surface-2)] px-1 py-0.5",
        "text-[length:var(--text-base)] text-[var(--color-ink)] outline-none",
        "ring-1 ring-[var(--color-accent)]",
      )}
    />
  );
}

function IconButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  /**
   * Aç/kapa düğmesi için basılı durum. Verilmezse `aria-pressed` hiç
   * yazılmaz — tek seferlik eylemlerde (sil, ertele) o nitelik ekran
   * okuyucuya olmayan bir durumu duyururdu.
   */
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-md",
        "transition-colors duration-[var(--duration-fast)]",
        "hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-2)]",
        pressed
          ? "bg-[var(--color-surface-3)] text-[var(--color-ink-2)]"
          : "text-[var(--color-ink-3)]",
      )}
    >
      {children}
    </button>
  );
}
