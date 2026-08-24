"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import type { Task } from "@/features/tasks/types";
import { placePopover, type AnchorPlacement, type Rect } from "./anchor";
import { TaskPopoverBody } from "./TaskPopoverBody";
import type { TaskPopoverActions } from "./useTaskPopoverActions";
import "@/components/sheet.css";
import "./taskpopover.css";

export interface TaskPopoverProps {
  task: Task;
  /** Tıklanan bloğun viewport rect'i. */
  anchorRect: Rect;
  /** Devralınacak kategori rengi. */
  inheritedColor: number | null;
  actions: TaskPopoverActions;
  onClose: () => void;
}

/**
 * Sheet eşiği.
 *
 * `sheet.css`'in kendi `@media (min-width: 640px)` sınırıyla AYNI —
 * ikinci bir kırılma noktası uydurmak, panelin kabuğu ile stili farklı
 * genişliklerde değişmesi demekti.
 */
const SHEET_QUERY = "(max-width: 639px)";

/**
 * Göreve tıklandığında bloğun YANINDA açılan düzenleme paneli.
 *
 * ── Neden portal? ──
 * Depoda başka portal yok ve bu bilinçli bir istisna. Panel ızgaranın
 * DOM ağacında kalamaz: `.dgBlock` `overflow: hidden`, `.dgColumn` ve
 * `.dgCanvas` `position: relative`. Ağaçta kalan bir panel ya kırpılır
 * ya da sütun genişliğine sıkışır. `createPortal` React'in kendi
 * API'si — yeni bağımlılık değil.
 *
 * ── Neden masaüstünde modal DEĞİL? ──
 * `<dialog showModal>` arka planı `inert` yapar. Izgarada bu yanlış:
 * kullanıcı açık panelden başka bir bloğa tıklayıp paneli oraya
 * taşıyabilmeli ve blokları sürüklemeye devam edebilmeli. Mobilde ise
 * tam tersi doğru — parmakla çapalı bir kutu kullanmak kötü — ve orada
 * `<dialog>` kullanılıyor, odak tuzağı ile Escape tarayıcıdan geliyor.
 *
 * ── Sürükleme motoruyla ilişki ──
 * `useDragBlock` `window` üzerinde pointer ve keydown dinliyor. İki
 * kural bu paneli onunla barıştırıyor:
 *
 *   1. Dışarı tıklama `pointerdown` CAPTURE fazında yakalanır ama
 *      `preventDefault` ÇAĞRILMAZ — panel kapanırken bloğun sürükleme
 *      başlangıcı engellenmemeli.
 *   2. Escape burada yalnızca panel kapatır. Motorun kendi Escape'i
 *      `ref.current` ile korunuyor, yani sürükleme yokken hiçbir şey
 *      yapmıyor; ikisi çakışmaz.
 */
export function TaskPopover({
  task,
  anchorRect,
  inheritedColor,
  actions,
  onClose,
}: TaskPopoverProps) {
  const isSheet = useIsSheet();

  /*
   * Portal SSR'de YOK: `document` yalnızca istemcide var.
   *
   * `useSyncExternalStore` ile: sunucu anlık görüntüsü `false`, istemci
   * `true`. Bunu `useEffect` + `setState` ile yapmak da mümkündü ama
   * React derleyicisi onu haklı olarak "kademeli render" diye
   * işaretliyor — bu bir DIŞ SİSTEM sorgusu (DOM var mı?), bir durum
   * geçişi değil.
   */
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  if (!hydrated) return null;

  return createPortal(
    isSheet ? (
      <SheetShell task={task} inheritedColor={inheritedColor} actions={actions} onClose={onClose} />
    ) : (
      <AnchoredShell
        task={task}
        anchorRect={anchorRect}
        inheritedColor={inheritedColor}
        actions={actions}
        onClose={onClose}
      />
    ),
    document.body,
  );
}

/**
 * Masaüstü: çapalı, modal olmayan panel.
 */
function AnchoredShell({
  task,
  anchorRect,
  inheritedColor,
  actions,
  onClose,
}: Omit<TaskPopoverProps, never>) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<AnchorPlacement | null>(null);

  /*
   * Konum, panel ÖLÇÜLDÜKTEN sonra hesaplanır: yüksekliği içeriğe
   * bağlı (saat alanı görevin saati varsa büyür) ve tahmin etmek,
   * ekranın dibindeki bir bloğun panelini yanlış çevirirdi.
   *
   * `useLayoutEffect`: boyama ÖNCESİ. `useEffect` olsaydı panel bir
   * kare boyunca (0,0)'da görünüp sonra yerine sıçrardı.
   */
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const measure = () => {
      /*
       * Çapa DOM'dan TAZE okunur, prop'taki dondurulmuş rect'ten
       * değil.
       *
       * Blok panel açıkken yer değiştirebilir: panelden saat vermek
       * onu ızgarada başka bir yere taşır, başka bir bloğun bırakılması
       * şeritleri yeniden paketler, saat penceresinin genişlemesi
       * hepsini birden kaydırır. Prop'taki rect o anların hiçbirini
       * bilmez ve panel bloğun eski yerinde asılı kalırdı.
       *
       * Blok bulunamazsa (görev silindi ya da görünür aralıktan çıktı)
       * prop'taki rect'e düşülür — panel yerinde kalır, sıçramaz.
       */
      const live = document
        .querySelector(`[data-task-id="${CSS.escape(task.id)}"]`)
        ?.getBoundingClientRect();

      setPlacement(
        placePopover({
          anchor: live ?? anchorRect,
          panel: { width: el.offsetWidth, height: el.offsetHeight },
          viewport: { width: window.innerWidth, height: window.innerHeight },
        }),
      );
    };

    measure();

    // İçerik büyüyünce (textarea genişletildi, süre satırı belirdi)
    // panel ekran dışına taşabilir; yeniden yerleştir.
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
    /*
     * `task` bağımlılıkta: görevin saati ya da süresi değişince blok
     * ızgarada yer değiştirir ve panel onu takip etmeli. Nesne her
     * mutasyonda yeni referans aldığı için bu doğal bir tetikleyici.
     */
  }, [anchorRect, task]);

  useDismiss(panelRef, onClose);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`${task.title} — düzenle`}
      className="tpPanel glassPanel rounded-[var(--r-xl)]"
      style={{
        left: placement?.left ?? 0,
        top: placement?.top ?? 0,
        // Ölçülene kadar GÖRÜNMEZ ama yer kaplar: `display:none`
        // olsaydı `offsetWidth` sıfır gelir ve ölçüm hiç yapılamazdı.
        visibility: placement === null ? "hidden" : undefined,
      }}
    >
      <TaskPopoverBody
        task={task}
        inheritedColor={inheritedColor}
        actions={actions}
        onClose={onClose}
      />
    </div>
  );
}

/**
 * Mobil: alttan yükselen sheet.
 *
 * `PlanDaySheet` ile aynı kabuk (`sheet.css`) — kullanıcı için "alttan
 * açılan panel" tek bir dil olmalı. Odak tuzağı, Escape ve üst katman
 * `showModal()`'dan geliyor; elle yazılmış bir tuzak hem gereksiz hem
 * de tarayıcınınkinden daha kötü olurdu.
 */
function SheetShell({
  task,
  inheritedColor,
  actions,
  onClose,
}: Omit<TaskPopoverProps, "anchorRect">) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="daySheet"
      aria-label={`${task.title} — düzenle`}
      onCancel={(e) => {
        // Tarayıcının varsayılan kapatması yerine bizimki: durum
        // çağıranda tutuluyor ve senkron kalmalı.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Perdeye tıklama. `<dialog>` perdesi elemanın KENDİSİDİR;
        // hedef dialog ise tıklama panelin dışına gelmiş demektir.
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="daySheetPanel">
        <TaskPopoverBody
          task={task}
          inheritedColor={inheritedColor}
          actions={actions}
          onClose={onClose}
        />
      </div>
    </dialog>
  );
}

/**
 * Dışarı tıklama, Escape ve KAYDIRMA ile kapatma.
 *
 * `pointerdown` CAPTURE fazında: `click` beklemek, kullanıcı bir bloğu
 * sürüklemeye başladığında paneli açık bırakırdı (sürükleme `click`
 * üretmez).
 *
 * `preventDefault` ÇAĞRILMAZ ve bu kritik: panel kapanırken tıklanan
 * bloğun `onPointerDown`'ı çalışmaya devam etmeli, yoksa panel açıkken
 * hiçbir blok sürüklenemezdi.
 *
 * ── Kaydırma neden KAPATIR? ──
 * Panel `fixed`, yani VIEWPORT uzayında; çapası ise tıklama anında
 * dondurulmuş bir rect. Sayfa kayınca blok panelin altından çıkar ve
 * panel hiçbir şeyin yanında durmayan bir kutuya dönüşür.
 *
 * İki alternatif vardı: çapayı her kaydırmada yeniden ölçüp paneli
 * takip ettirmek, ya da kapatmak. Takip ettirmek yalnızca kaydırmayı
 * değil, bloğun yer değiştirdiği HER durumu çözmeliydi — başka bir
 * bloğun bırakılması şeritleri yeniden paketler, saat penceresi
 * değişince bütün bloklar kayar. Kapatmak, "panelin dışıyla
 * etkileşince kapanır" kuralının doğal devamı ve zaten bu dosyadaki
 * diğer iki çıkış yoluyla aynı dilde.
 *
 * `capture: true` ŞART: kaydırma olayı BALONLANMAZ, dolayısıyla
 * ızgaranın kendi kaydırma kabı (`.planGridScroll`) window'a hiç
 * ulaşmazdı.
 */
function useDismiss(
  panelRef: React.RefObject<HTMLDivElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const panel = panelRef.current;
      if (!panel) return;
      if (e.target instanceof Node && panel.contains(e.target)) return;
      onClose();
    }

    function onKeyDown(e: KeyboardEvent) {
      // Metin alanları kendi Escape'lerini `stopPropagation` ile
      // yutuyor (bkz. TaskPopoverBody): buraya ulaşan Escape, odağın
      // alanda OLMADIĞI anlamına gelir.
      if (e.key === "Escape") onClose();
    }

    function onScroll(e: Event) {
      // Panelin KENDİ içeriğinin kaydırılması (uzun açıklama) paneli
      // kapatmamalı — çapayla ilgisi yok.
      const panel = panelRef.current;
      if (panel && e.target instanceof Node && panel.contains(e.target)) return;
      onClose();
    }

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [panelRef, onClose]);
}

/**
 * Dar ekran mı? (kabuk sheet olmalı mı?)
 *
 * `useDayGridSurface`'ın `useWideViewport`'uyla AYNI desen ve aynı
 * gerekçe: `matchMedia` dinlenir, `resize` değil — tarayıcı eşiği
 * geçildiğinde zaten haber veriyor, her pikselde render etmenin anlamı
 * yok.
 *
 * Sunucu anlık görüntüsü `false` (masaüstü kabuğu): sunucuda viewport
 * bilinemez ve hydration uyuşmazlığı riski alınmaz. Zaten `hydrated`
 * kapısı ilk boyamada hiçbir şey çizmiyor.
 */
function useIsSheet(): boolean {
  return useSyncExternalStore(subscribeToSheet, getSheetSnapshot, () => false);
}

function subscribeToSheet(onChange: () => void): () => void {
  const mql = window.matchMedia(SHEET_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSheetSnapshot(): boolean {
  return window.matchMedia(SHEET_QUERY).matches;
}

/** Hiç değişmeyen kaynak — `hydrated` kapısı için. */
function subscribeNever(): () => void {
  return () => {};
}
