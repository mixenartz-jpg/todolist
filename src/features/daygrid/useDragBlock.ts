"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { DateStr } from "@/lib/date/types";
import type { Task } from "@/features/tasks/types";
import type { DragResult } from "./drop";
import {
  clampDuration,
  clampStart,
  DEFAULT_DURATION,
  snapMinutes,
  yToMinute,
  type GridMetrics,
} from "./geometry";

export type DragMode = "move" | "resize";

export interface DragState {
  taskId: string;
  mode: DragMode;
  /** Canlı önizleme — HENÜZ YAZILMADI. */
  previewStart: number;
  previewDuration: number | null;
  previewDate: DateStr;
  /** Saatsiz şeridin üzerindeyiz — bırakılırsa saat silinir. */
  overUntimed: boolean;
}

interface UseDragBlockOptions {
  metrics: GridMetrics;
  /** Sütun tarihleri, soldan sağa. Sürükleme hit-test'i buradan. */
  dates: readonly DateStr[];
  /** Tuvalin DOM referansı — koordinat çevrimi için. */
  canvasRef: RefObject<HTMLElement | null>;
  /** Saatsiz şerit; yoksa "ızgaradan çıkarma" hedefi de yok. */
  untimedRef: RefObject<HTMLElement | null>;
  onCommit: (result: DragResult) => void;
}

/** Fare/kalemde sürükleme sayılması için gereken hareket. */
const MOUSE_THRESHOLD_PX = 4;
/** Dokunmada bu kadar hareket, uzun basma dolmadan gelirse: KAYDIRMA. */
const TOUCH_CANCEL_PX = 10;
/** Dokunmada sürüklemenin başlaması için gereken basılı tutma. */
const LONG_PRESS_MS = 350;

interface DragRef {
  task: Task;
  mode: DragMode;
  pointerId: number;
  pointerType: string;
  originX: number;
  originY: number;
  /** Tıklanan nokta ile blok başlangıcı arasındaki fark, dakika. */
  grabOffset: number;
  /** Sürükleme gerçekten başladı mı? */
  armed: boolean;
  /** Dokunmada uzun basma doldu mu? */
  longPressed: boolean;
  /** Dokunmada vazgeçildi mi (kaydırma anlaşıldı)? */
  abandoned: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  element: HTMLElement;
}

/**
 * Blok sürükleme ve boyutlandırma motoru — Pointer Events.
 *
 * ── Neden HTML5 DnD değil? ──
 * `draggable` mobilde hiç çalışmaz, sürükleme görüntüsü
 * özelleştirilemez ve `dragover` koordinatları güvenilmez. Pointer
 * Events fare/dokunma/kalemi tek yolda birleştirir; `setPointerCapture`
 * sürüklemeyi eleman DOM'dan çıksa bile hedefte tutar. Yeni bağımlılık
 * da gerekmez — depo altı bağımlılıkla yaşıyor.
 *
 * ── Dokunmada kaydırmayla çakışma ──
 * Bu deponun sürüklemeyi üç yerde reddetme gerekçelerinden biriydi
 * (bkz. ReorderButtons). Çözüm: dokunmada sürükleme UZUN BASMAYLA
 * başlar; parmak eşikten önce kayarsa bu bir kaydırmadır ve
 * sürüklemeden tamamen vazgeçilir. Sayfa her zaman kaydırılabilir
 * kalır.
 *
 * ── Mutasyon NE ZAMAN atılır? ──
 * Yalnızca `pointerup`'ta, bir kez. Ara durum `DragState`'te yaşar;
 * her `pointermove`'da yazsaydık tek sürüklemede altmış yazma olurdu.
 */
export function useDragBlock({
  metrics,
  dates,
  canvasRef,
  untimedRef,
  onCommit,
}: UseDragBlockOptions) {
  const [drag, setDrag] = useState<DragState | null>(null);

  /*
   * Sürükleme muhasebesi state'te DEĞİL ref'te: `armed` olmadan önce
   * her `pointermove` bir render tetiklerse tıklama bile bir kare
   * kaybeder. Ref yalnızca olay işleyicilerinde okunur — render'a
   * giren her şey `DragState`'tedir (React Compiler kuralı).
   */
  const ref = useRef<DragRef | null>(null);

  /** Bırakmadan hemen sonra gelen `click`'i yutmak için — bkz. finish. */
  const justDragged = useRef(false);

  /*
   * Son metrikler/tarihler işleyicilere ref üzerinden ulaşır: pencere
   * olay dinleyicileri bir kez bağlanıyor ve kapanışları bayat
   * kalmamalı.
   *
   * Yazma RENDER'DA DEĞİL effect'te: render sırasında ref güncellemek
   * React'in eşzamanlı modunda güvenli değil (react-hooks/refs).
   * Sürükleme yalnızca olaylardan okuyor, effect'in bir kare sonra
   * çalışması sorun değil.
   */
  const latest = useRef({ metrics, dates, onCommit });

  useEffect(() => {
    latest.current = { metrics, dates, onCommit };
  }, [metrics, dates, onCommit]);

  const finish = useCallback((commit: boolean) => {
    const state = ref.current;
    ref.current = null;
    if (!state) return;

    /*
     * "Az önce sürüklendi" bayrağı, `ref` temizlendikten SONRA da bir
     * süre yaşamalı.
     *
     * Tarayıcı `pointerup`'ın ardından ayrıca bir `click` gönderir ve o
     * an `ref.current` çoktan null'dır — `didDrag()` false döner, blok
     * da düzenleme panelini açardı. Yani sürükleme "çalışır" ama her
     * bırakma bir de panel açardı. Bayrak bir sonraki tick'te silinir:
     * `click` o turdan önce gelir, sonraki gerçek tıklama ise sonra.
     */
    if (state.armed) {
      justDragged.current = true;
      setTimeout(() => {
        justDragged.current = false;
      }, 0);
    }

    if (state.timer) clearTimeout(state.timer);
    state.element.releasePointerCapture?.(state.pointerId);
    state.element.classList.remove("dgBlockDragging");

    setDrag((current) => {
      if (commit && current && state.armed) {
        latest.current.onCommit({
          task: state.task,
          targetDate: current.previewDate,
          targetStart: current.overUntimed ? null : current.previewStart,
          targetDuration: current.overUntimed ? null : current.previewDuration,
        });
      }
      return null;
    });
  }, []);

  /**
   * Sürüklemeyi başlatır: bayrağı çevirir, sınıfı ekler ve önizleme
   * durumunu TOHUMLAR.
   *
   * Fare ve dokunma yolları bunu ayrı yerlerden çağırıyor (biri eşikte,
   * diğeri uzun basmada); tek fonksiyonda toplanmasının nedeni tam da
   * bu: fare yolu bir ara yalnızca bayrağı çevirip `setDrag`'i
   * atlıyordu ve sonraki güncellemeler `null` durum üzerinde çalışıp
   * sessizce hiçbir şey yapmıyordu — sürükleme "çalışıyor" görünüp
   * hiçbir önizleme çizmiyordu.
   */
  const armDrag = useCallback((s: DragRef) => {
    s.armed = true;
    s.element.classList.add("dgBlockDragging");

    const start = s.task.startTime
      ? minutesOf(s.task.startTime)
      : latest.current.metrics.startMinute;

    setDrag({
      taskId: s.task.id,
      mode: s.mode,
      previewStart: start,
      /*
       * Taşımada süre OLDUĞU GİBİ taşınır — süresiz görev süresiz kalır.
       *
       * Burada `?? DEFAULT_DURATION` yazmak cazipti (hayalet o zaman
       * hep çizilebilir bir yüksekliğe sahip olur), ama sonucu şuydu:
       * süresi olmayan bir bloğu sadece başka saate SÜRÜKLEMEK ona
       * sessizce 30 dakika atıyordu. Kullanıcı boyutlandırma tutamağına
       * hiç dokunmamışken süre kazanması, taşımanın ne yaptığına dair
       * verilen sözü bozar.
       *
       * Boyutlandırma ise farklı: orada kullanıcı zaten bir süre
       * BELİRLİYOR, o yüzden null'dan başlayanlar varsayılana oturur.
       */
      previewDuration:
        s.mode === "resize"
          ? (s.task.durationMinutes ?? DEFAULT_DURATION)
          : s.task.durationMinutes,
      previewDate: s.task.dueDate ?? latest.current.dates[0],
      overUntimed: false,
    });
  }, []);

  const begin = useCallback(
    (task: Task, mode: DragMode, e: React.PointerEvent<HTMLElement>) => {
      // Sağ tık ve orta tık sürüklemez.
      if (e.button !== 0) return;
      if (ref.current) return;

      const element = e.currentTarget;
      element.setPointerCapture?.(e.pointerId);

      const { metrics: m } = latest.current;
      const start = task.startTime ? minutesOf(task.startTime) : m.startMinute;
      const pointerMinute = pointerToMinute(e.clientY, canvasRef.current, m);

      const state: DragRef = {
        task,
        mode,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        originX: e.clientX,
        originY: e.clientY,
        // Onsuz blok, sürüklerken parmağın altına ZIPLAR.
        grabOffset: mode === "move" ? pointerMinute - start : 0,
        armed: false,
        longPressed: e.pointerType !== "touch",
        abandoned: false,
        timer: null,
        element,
      };

      if (e.pointerType === "touch") {
        state.timer = setTimeout(() => {
          if (ref.current !== state || state.abandoned) return;
          state.longPressed = true;
          armDrag(state);
        }, LONG_PRESS_MS);
      }

      ref.current = state;
    },
    [canvasRef, armDrag],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const state = ref.current;
      if (!state || e.pointerId !== state.pointerId) return;

      const dx = e.clientX - state.originX;
      const dy = e.clientY - state.originY;

      if (!state.armed) {
        if (state.pointerType === "touch") {
          /*
           * Uzun basma dolmadan hareket = KAYDIRMA. Sürüklemeden
           * tamamen vazgeç; sayfa parmağın altında kaymaya devam etsin.
           */
          if (!state.longPressed && Math.hypot(dx, dy) > TOUCH_CANCEL_PX) {
            state.abandoned = true;
            finish(false);
          }
          return;
        }

        if (Math.hypot(dx, dy) < MOUSE_THRESHOLD_PX) return;
        armDrag(state);
      }

      const { metrics: m, dates: cols } = latest.current;
      const pointerMinute = pointerToMinute(e.clientY, canvasRef.current, m);

      const untimed = untimedRef.current?.getBoundingClientRect();
      const overUntimed =
        state.mode === "move" &&
        untimed !== undefined &&
        e.clientY >= untimed.top &&
        e.clientY <= untimed.bottom;

      setDrag((current) => {
        if (!current) return current;

        if (state.mode === "resize") {
          const duration = clampDuration(
            current.previewStart,
            snapMinutes(pointerMinute - current.previewStart),
            m,
          );
          return { ...current, previewDuration: duration, overUntimed: false };
        }

        const raw = snapMinutes(pointerMinute - state.grabOffset);
        const previewStart = clampStart(raw, state.task.durationMinutes, m);
        const previewDate =
          columnAt(e.clientX, canvasRef.current, cols) ?? current.previewDate;

        return { ...current, previewStart, previewDate, overUntimed };
      });
    }

    function onUp(e: PointerEvent) {
      if (!ref.current || e.pointerId !== ref.current.pointerId) return;
      finish(true);
    }

    function onCancel(e: PointerEvent) {
      if (!ref.current || e.pointerId !== ref.current.pointerId) return;
      finish(false);
    }

    function onKey(e: KeyboardEvent) {
      // Escape iptal eder ve YAZMAZ — `TitleEditor`'ın sözleşmesi.
      if (e.key === "Escape" && ref.current) {
        e.preventDefault();
        finish(false);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
    };
  }, [canvasRef, untimedRef, finish, armDrag]);

  const startMove = useCallback(
    (task: Task, e: React.PointerEvent<HTMLElement>) => begin(task, "move", e),
    [begin],
  );

  const startResize = useCallback(
    (task: Task, e: React.PointerEvent<HTMLElement>) => begin(task, "resize", e),
    [begin],
  );

  /**
   * Bu tıklama bir sürüklemenin artığı mı?
   *
   * Hem sürükleme sürerken (ref dolu) hem de bırakmadan hemen sonra
   * (bayrak) true döner — ikincisi olmadan her bırakma bir de düzenleme
   * paneli açardı.
   */
  const didDrag = useCallback(
    () => ref.current?.armed === true || justDragged.current,
    [],
  );

  return { drag, startMove, startResize, didDrag };
}

/** Ekran koordinatını tuvale göre dakikaya çevirir. */
function pointerToMinute(
  clientY: number,
  canvas: HTMLElement | null,
  metrics: GridMetrics,
): number {
  if (!canvas) return metrics.startMinute;
  const rect = canvas.getBoundingClientRect();
  return yToMinute(clientY - rect.top, metrics);
}

/** Yatay konumun düştüğü sütunun tarihi. Tuval dışındaysa null. */
function columnAt(
  clientX: number,
  canvas: HTMLElement | null,
  dates: readonly DateStr[],
): DateStr | null {
  if (!canvas || dates.length === 0) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return null;

  const ratio = (clientX - rect.left) / rect.width;
  const index = Math.floor(ratio * dates.length);
  // Kenarların dışına taşan sürükleme uçtaki sütuna sabitlenir; null
  // dönmek bloğun günü belirsiz kalmasına yol açardı.
  return dates[Math.max(0, Math.min(dates.length - 1, index))];
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export { DEFAULT_DURATION };
