/**
 * Çapalı panelin konumlandırma matematiği.
 *
 * ── Neden elde yazıldı? ──
 * Depoda hiçbir arayüz kütüphanesi yok (floating-ui, radix, popper —
 * hiçbiri) ve bu bilinçli bir tercih: bağımlılık listesi altı paketten
 * ibaret. Konumlandırma için kütüphane eklemek, otuz satırlık bir
 * matematiği yüz kilobaytlık bir soyutlamayla değiştirmek olurdu.
 *
 * ── Neden ayrı, DOM'suz bir modül? ──
 * Vitest `environment: "node"` ile çalışıyor ve `.tsx` test edilmiyor.
 * Bu dosya `DOMRect` değil düz `Rect` alır; böylece taşma, çevirme ve
 * kırpma davranışlarının tamamı tarayıcı açmadan ölçülebilir. Bileşen
 * sınırda `getBoundingClientRect()` sonucunu kopyalar.
 *
 * Tüm koordinatlar VIEWPORT uzayındadır (`position: fixed` ile aynı
 * uzay) — sayfa kaydırması hesaba katılmaz.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface AnchorInput {
  /** Tıklanan bloğun viewport rect'i. */
  anchor: Rect;
  /** Panelin ölçülmüş boyutu. */
  panel: Size;
  viewport: Size;
  /** Ekran kenarlarından bırakılacak pay, px. */
  margin?: number;
  /** Çapa ile panel arasındaki boşluk, px. */
  gap?: number;
}

/** Panelin çapaya göre hangi tarafa açıldığı. */
export type PopoverSide = "right" | "left" | "bottom" | "top";

export interface AnchorPlacement {
  left: number;
  top: number;
  side: PopoverSide;
}

export const DEFAULT_MARGIN = 8;
export const DEFAULT_GAP = 8;

/**
 * Paneli çapanın yanına yerleştirir.
 *
 * Sıra: sağ → sol → alt → üst. İlk SIĞAN taraf seçilir.
 *
 * Neden sağ önce: ızgara sütunları soldan sağa diziliyor ve bloğun
 * sağındaki alan tipik olarak boş. Pazar sütunundaki bir bloğa
 * tıklandığında sağ dolu olur ve panel sola çevrilir.
 *
 * Hiçbir taraf sığmasa bile bir sonuç DÖNER: son çare `top`'tur ve
 * kırpma onu ekranın içine çeker. "Yer yok" diye null dönmek, kullanıcı
 * için paneli hiç açmamak demekti — kırpılmış bir panel her zaman
 * yokluğundan iyidir.
 */
export function placePopover(input: AnchorInput): AnchorPlacement {
  const { anchor, panel, viewport } = input;
  const margin = input.margin ?? DEFAULT_MARGIN;
  const gap = input.gap ?? DEFAULT_GAP;

  const side = chooseSide(anchor, panel, viewport, margin, gap);

  /*
   * Yatay eksende: yan taraflarda panel çapanın dışına konur, alt/üst
   * taraflarda çapayla SOL kenarından hizalanır. Dikey eksende
   * simetrik olarak tersi.
   */
  const left =
    side === "right"
      ? anchor.x + anchor.width + gap
      : side === "left"
        ? anchor.x - panel.width - gap
        : anchor.x;

  const top =
    side === "bottom"
      ? anchor.y + anchor.height + gap
      : side === "top"
        ? anchor.y - panel.height - gap
        : anchor.y;

  return {
    left: clamp(left, margin, viewport.width - panel.width - margin),
    top: clamp(top, margin, viewport.height - panel.height - margin),
    side,
  };
}

function chooseSide(
  anchor: Rect,
  panel: Size,
  viewport: Size,
  margin: number,
  gap: number,
): PopoverSide {
  const need = (space: number) => space >= panel.width + gap + margin;
  const needTall = (space: number) => space >= panel.height + gap + margin;

  if (need(viewport.width - (anchor.x + anchor.width))) return "right";
  if (need(anchor.x)) return "left";
  if (needTall(viewport.height - (anchor.y + anchor.height))) return "bottom";
  return "top";
}

/**
 * Değeri aralığa çeker.
 *
 * `max < min` durumu GERÇEKTİR ve yutulmalıdır: panel viewport'tan
 * büyükse üst sınır alt sınırın altına düşer. O zaman `min` kazanır —
 * yani panel sol/üst kenara oturur ve kendi `overflow: auto`'su devreye
 * girer. Sıralamayı `Math.min(Math.max(...))` ile kurmak bunu doğal
 * olarak verir; ters sırada kurulsaydı panel ekran dışına kaçardı.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
