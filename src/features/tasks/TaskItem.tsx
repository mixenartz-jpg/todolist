"use client";

import { memo, useRef, useState, type ReactNode } from "react";
import type { DateStr } from "@/lib/date/types";
import { cn } from "@/lib/ui/cn";
import { formatShortDate } from "@/lib/ui/tr";
import { isOverdue } from "./queries";
import { normalizeTitleInput, shouldPersistTitle, TASK_TITLE_MAX } from "./rename";
import { DURATION_PRESETS, formatDuration } from "./schedule";
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
   * Saat/süre ayarlama. Verilmezse kontrol hiç gösterilmez —
   * tarihsiz görevlerin ("bir ara") saati olmaz.
   */
  onSetTime?: (startTime: string | null, durationMinutes: number | null) => void;
  /**
   * Saat çipini gizle. Gün planında saat zaten sol olukta yazıyor;
   * satırda tekrarlamak aynı bilgiyi iki kez göstermek olur.
   */
  hideTime?: boolean;
  /**
   * Ad düzenleme. Verilmezse başlık düz metin kalır.
   *
   * Çağrılmadan ÖNCE girdi doğrulanır (bkz. `rename.ts`): boş ya da
   * değişmemiş bir ad buraya hiç ulaşmaz.
   */
  onRename?: (title: string) => void;
  /**
   * Gün seçici paneli. Verilirse "ertele" simgesi bir sonraki güne
   * itmek yerine bu paneli açar.
   *
   * Aynı simgenin iki anlam taşıması bilinçli: "yarına it" ve "bir
   * güne taşı" aynı hareketin iki hassasiyetidir. İkinci bir simge
   * eklemek, satırdaki eylem kümesini dörde çıkarır ve haftalık
   * ızgaranın dar sütununda yer kalmazdı.
   */
  dayPicker?: ReactNode;
  /**
   * Başlığın altında her zaman duran ek kontrol (ör. sıra düğmeleri).
   *
   * `dayPicker`'dan AYRI bir yuva: o bir simgenin arkasında açılıp
   * kapanan bir panel, bu ise kalıcı. `dayPicker`'a verilseydi sıra
   * düğmeleri "ertele" simgesine basılmadan görünmez olurdu ve o
   * simgenin anlamı üçüncü kez değişirdi.
   */
  extra?: ReactNode;
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
   * Dar sütun düzeni: eylem simgeleri başlığın YANINDA değil ALTINDA.
   *
   * Haftalık/plan ızgarasında sütun ~140px'e iner. Simgeler satırda
   * kalırsa (kutucuk 40px + üç simge 96px + boşluklar) başlığa sıfır
   * genişlik kalır ve görev ADSIZ görünür — `min-w-0` ile `truncate`
   * metni sessizce tamamen kırpar. Simgeleri alta almak başlığa tüm
   * satırı bırakır.
   */
  compact?: boolean;
}

export const TaskItem = memo(function TaskItem({
  task,
  today,
  onToggle,
  onDelete,
  onDefer,
  onSetTime,
  onRename,
  hideTime = false,
  dayPicker,
  extra,
  marker,
  compact = false,
}: TaskItemProps) {
  const overdue = isOverdue(task, today);
  const [editingTime, setEditingTime] = useState(false);
  const [movingDay, setMovingDay] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  /*
   * Tamamlanmış görevin adı düzenlenmez. Üstü çizili bir metne tıklayınca
   * düzenleme kutusu açılması, işaretlemeyi geri almaya çalışan eli
   * yanlış yere götürür; bitmiş bir işin adını değiştirmek de nadir bir
   * ihtiyaçtır — kutucuğu geri alıp düzenlemek hâlâ mümkün.
   */
  const canRename = Boolean(onRename) && !task.done;

  return (
    <li
      className={cn(
        "rowEnter revealOnHover flex rounded-xl border py-2.5",
        // Dar sütunda yatay dolgu kısalır: 24px sadece kenar boşluğuna
        // gidiyordu ve başlık o genişliğe muhtaç.
        compact ? "px-2" : "px-3",
        /*
         * Dar sütunda satır SARAR ve sıra değişir: başlık en üstte tek
         * başına, kutucuk ile simgeler altındaki satırda yan yana.
         *
         * Yan yana dizilimde (kutucuk 40px + üç simge 96px) başlığa
         * sıfır genişlik kalıyor, `truncate` de metni tamamen kırpıyordu
         * — görev ADSIZ görünürdü. Kutucuğu da alta almak, başlığa
         * sütunun tamamını bırakır; 64px'lik bir şeride sıkışan metin
         * "Matemat / ik" diye kelime ortasından bölünüyordu.
         */
        /*
         * `gap-x-0`: kutucuk ile simge grubunu `justify-between` zaten
         * iki uca yaslıyor. Ek bir sütun boşluğu 112px'lik iç alanda
         * gereken 118px'i aşırıp simgeleri üçüncü satıra itiyordu.
         */
        compact
          ? "flex-wrap items-center justify-between gap-x-0 gap-y-1.5"
          : "items-center gap-3",
        "transition-colors duration-[var(--duration-base)] ease-[var(--ease-out-quart)]",
        task.done
          ? "border-transparent bg-[var(--color-surface-2)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={task.done}
        aria-label={task.done ? `${task.title}: geri al` : `${task.title}: tamamla`}
        className={cn(
          "grid shrink-0 place-items-center rounded-lg",
          "transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]",
          /*
           * Dar sütunda kutucuk küçülür ama dokunma hedefi küçülmez:
           * `before` sözde elemanı görünmez alanı 44px'e tamamlar.
           * 40px'lik kutu 140px'lik sütunda başlığa yer bırakmıyordu.
           */
          compact
            ? "relative order-2 size-7 before:absolute before:-inset-2 before:content-['']"
            : "size-10",
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

      {/* compact: başlık tek başına üst satırda, sütunun tam genişliği. */}
      <div className={cn("min-w-0 flex-1", compact && "order-1 w-full flex-none")}>
        <div
          className={cn(
            "flex gap-2 text-[length:var(--text-base)]",
            // Sarmalı metinde taban hizası ilk satıra göre hesaplanır
            // ve saat çipi metnin ortasında asılı kalırdı.
            compact ? "items-start" : "items-baseline",
            task.done && "text-[var(--color-ink-3)] line-through",
          )}
        >
          {/* Kategori noktası saatin de solunda: satırın en başındaki
              sabit konum, göz taramasını kolaylaştırır. */}
          {marker && (
            <span
              className={cn(
                "flex shrink-0",
                // Sarmalı başlıkta nokta ilk satırın ortasına hizalanır;
                // `items-start` altında tepeye yapışıp kayardı.
                compact ? "mt-[0.4em]" : "self-center",
              )}
            >
              {marker}
            </span>
          )}

          {!hideTime && task.startTime && (
            <span className="tabular shrink-0 text-[var(--color-ink-3)]">
              {task.startTime}
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
                 * Dar sütunda başlık SARAR, kırpılmaz: 140px'e uzun bir
                 * görev adı zaten sığmaz ve "Matem..." hiçbir şey
                 * söylemez. İki satır, yarım kelimeden iyidir.
                 *
                 * `wrap-anywhere` DEĞİL `break-words`: ilki kelimeyi
                 * ortadan böler ("Matemat / ik testi"), ikincisi önce
                 * kelime sınırını dener ve yalnızca satıra sığmayan tek
                 * bir kelimeyi zorlar.
                 */
                compact ? "break-words" : "truncate",
              )}
            >
              {task.title}
            </button>
          ) : (
            <span className={compact ? "break-words" : "truncate"}>
              {task.title}
            </span>
          )}
          {!hideTime && task.durationMinutes && (
            <span className="shrink-0 text-[length:var(--text-xs)] text-[var(--color-ink-3)]">
              {formatDuration(task.durationMinutes)}
            </span>
          )}
        </div>

        {editingTime && onSetTime && (
          <TimeEditor
            task={task}
            onClose={() => setEditingTime(false)}
            onSet={onSetTime}
          />
        )}

        {movingDay && dayPicker}

        {extra}

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
          "revealTarget flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-[var(--duration-fast)]",
          /*
           * Kutucukla AYNI satırda, onun sağında.
           *
           * `ml-auto` DEĞİL: otomatik kenar boşluğu sarma hesabında
           * kalan alanı doldurur ve simgeleri üçüncü bir satıra iterdi.
           * Boşluğu kutucuğun `flex-1`'i üstlenir.
           */
          compact && "order-3",
        )}
      >
        {onSetTime && !task.done && (
          <IconButton
            label={`${task.title}: saat ayarla`}
            compact={compact}
            onClick={() => setEditingTime((open) => !open)}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M8 4.75V8l2.25 1.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
        )}

        {(onDefer || dayPicker) && !task.done && (
          <IconButton
            label={
              dayPicker
                ? `${task.title}: başka güne taşı`
                : `${task.title}: yarına ertele`
            }
            compact={compact}
            onClick={
              dayPicker ? () => setMovingDay((open) => !open) : () => onDefer?.()
            }
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

        <IconButton
          label={`${task.title}: sil`}
          compact={compact}
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

/**
 * Saat ve süre ayarlama paneli.
 *
 * Görev eklerken DEĞİL, sonradan açılır: tek satırlık hızlı ekleme
 * "görev eklemek tek cümle yazmaktır" ilkesini korumalı. Saat, planı
 * kuran ikinci bir hareket olarak verilir.
 *
 * Süre ön ayarlardan seçilir; serbest dakika girişi bu ekranda
 * kimsenin ihtiyaç duymadığı bir hassasiyet olurdu.
 */
function TimeEditor({
  task,
  onClose,
  onSet,
}: {
  task: Task;
  onClose: () => void;
  onSet: (startTime: string | null, durationMinutes: number | null) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <input
        type="time"
        value={task.startTime ?? ""}
        aria-label="Başlangıç saati"
        onChange={(e) => onSet(e.target.value || null, task.durationMinutes)}
        className="tabular h-8 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface-2)] px-2 text-[length:var(--text-sm)] outline-none focus:border-[var(--color-accent)]"
      />

      {task.startTime &&
        DURATION_PRESETS.map((minutes) => (
          <button
            key={minutes}
            type="button"
            aria-pressed={task.durationMinutes === minutes}
            onClick={() =>
              onSet(
                task.startTime,
                task.durationMinutes === minutes ? null : minutes,
              )
            }
            className={cn(
              "h-8 rounded-md px-2 text-[length:var(--text-xs)]",
              "transition-colors duration-[var(--duration-fast)]",
              task.durationMinutes === minutes
                ? "bg-[color-mix(in_oklch,var(--color-accent)_18%,transparent)] text-[var(--color-ink)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]",
            )}
          >
            {formatDuration(minutes)}
          </button>
        ))}

      {task.startTime && (
        <button
          type="button"
          onClick={() => {
            onSet(null, null);
            onClose();
          }}
          className="h-8 rounded-md px-2 text-[length:var(--text-xs)] text-[var(--color-ink-3)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-danger)]"
        >
          Saati kaldır
        </button>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  compact = false,
  children,
}: {
  label: string;
  onClick: () => void;
  /** Dar sütun: simge kutusu küçülür, dokunma hedefi korunur. */
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid place-items-center rounded-md text-[var(--color-ink-3)]",
        "transition-colors duration-[var(--duration-fast)]",
        "hover:bg-[var(--color-surface-3)] hover:text-[var(--color-ink-2)]",
        /*
         * 136px'lik iç alana kutucuk (28) + üç simge (3×32) + boşluklar
         * sığmıyordu ve simgeler üçüncü bir satıra sarıyordu. 26px'e
         * inince toplam ~110px olur; `before` görünmez alanı 44px'lik
         * dokunma hedefine tamamlar.
         */
        compact
          ? "relative size-[26px] before:absolute before:-inset-2 before:content-['']"
          : "size-8",
      )}
    >
      {children}
    </button>
  );
}
