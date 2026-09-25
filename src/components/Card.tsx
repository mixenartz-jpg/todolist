import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

/*
 * İçerik kartı.
 *
 * ── KART DAİMA KENARLIKLI, ASLA GÖLGELİ ──
 *
 * Kodda iki rakip desen vardı: yükseltilmiş kart (Notlar, Giriş —
 * 2 yer) ve kenarlıklı kart (Rutinler ve diğerleri — 23 yer). Kenarlık
 * kazandı; 23'e 2 yakın bir karar değil. Üstelik zemin #080808'e
 * indiği için siyah gölge orada zaten neredeyse hiçbir şey yapmıyor.
 *
 * Bu kural `globals.css`'teki yüzey doktrinini HATIRLANAN bir şey
 * olmaktan çıkarıp YAPISAL hâle getiriyor: `Card`'a gölge geçirmenin
 * bir yolu yok, çünkü öyle bir prop yok. Gölge yüzen kabuğun hakkı.
 *
 * TEK istisna `--glow-card`: siyah bir gölge değil, kenarlıkla
 * BİRLİKTE yaşamak için tasarlanmış düşük opaklıklı mavi bir hale
 * (bkz. globals.css). Mavi/ışımalı temada kartları zeminden ayıran
 * şey o; tondan gelir, prop'la eklenemez.
 *
 * ── İç içe kart YASAK ──
 * `impeccable`: "nested cards are always wrong". İç içe bir kutu
 * gerekiyorsa `tone="sunken"` kullanılır — kenarlıksız, bir tık koyu.
 */

type CardTone = "default" | "sunken" | "selected" | "target";
type CardPad = "none" | "sm" | "md";

const TONES: Record<CardTone, string> = {
  /* Sol üstten hafif bir parlama: lacivert kart düz bir blok değil,
   * ışığı alan bir panel gibi okunur (hedef görseldeki kartlar). */
  default:
    "border border-[var(--color-line)] bg-[var(--color-surface)] bg-[image:linear-gradient(160deg,oklch(1_0_0/0.035),transparent_55%)] shadow-[var(--glow-card)]",
  /* İç içe kutu: kart DEĞİL, kartın içindeki çukur alan. Kenarlığı
   * yok — iki kenarlığın yan yana gelmesi çift çizgi yapardı. */
  sunken: "bg-[var(--color-surface-2)]",
  /* Seçili: kenar mürekkebe yaklaşır. Renk tek başına bilgi taşımaz;
   * çağıran ayrıca `aria-selected`/`aria-current` vermelidir. */
  selected:
    "border border-[var(--color-line-3)] bg-[var(--color-surface-2)] shadow-[var(--glow-card-hover)]",
  /* Yerleştirme hedefi: kesikli kenar + zemin yıkaması. İki kanal —
   * kenar STİLİ tek başına renk körlüğünde de, düşük kontrastta da
   * zayıf bir sinyal. */
  target:
    "border border-dashed border-[var(--color-line-3)] bg-[color-mix(in_oklch,var(--color-ink)_4%,transparent)]",
};

const PADS: Record<CardPad, string | undefined> = {
  none: undefined,
  sm: "var(--card-p-sm)",
  md: "var(--card-p)",
};

/**
 * Kartın çizebileceği elemanlar.
 *
 * Serbest `ElementType` DEĞİL: kart bir `<input>` ya da `<img>`
 * olamaz (`children` almazlar) ve `any`'ye kaçmadan tip güvenli bir
 * spread yazmanın yolu izin verilen kümeyi daraltmaktan geçiyor.
 */
type CardTag = "div" | "section" | "article" | "li" | "aside";

interface CardOwnProps {
  /** `li`, `section`, `article`… Varsayılan `div`. */
  as?: CardTag;
  tone?: CardTone;
  pad?: CardPad;
  /** Tıklanabilir kart: hover'da kenar aydınlanır, basınca küçülür. */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

/* Kalan tüm DOM prop'ları (aria-*, id, onClick…) geçer; `Card`'ın
 * kendi prop'ları çakışmasın diye ayrılır. */
type CardProps = CardOwnProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof CardOwnProps>;

/*
 * Tıklanabilir kartın sınıfları.
 *
 * `cn()` düz string alır, dizi almaz — okunabilirlik için burada
 * ayrı bir sabit olarak duruyor.
 *
 * `[@media(hover:hover)]:hover:` — dokunmatikte hover tıklamayla
 * tetiklenir ve kart dokunulduktan sonra "seçili" gibi takılı kalırdı.
 */
const INTERACTIVE = [
  "transition-[border-color,background-color,transform]",
  "duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]",
  "[@media(hover:hover)]:hover:border-[var(--color-line-3)]",
  "active:scale-[0.99]",
].join(" ");

export function Card({
  as = "div",
  tone = "default",
  pad = "md",
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  /*
   * `as` prop'u `CardTag` birleşimiyle zaten daraltılmış durumda; ama
   * JSX bir birleşim tipini eleman olarak çizerken prop'ları TÜM
   * üyelerin KESİŞİMİNE göre denetliyor ve `<div>` olay tipleri
   * `<li>`'ninkiyle uyuşmadığı için reddediyor.
   *
   * `ElementType`'a genişletmek denetimi eleman seçimine bırakır.
   * Güvenlik kaybı yok: hangi etiketlerin geçerli olduğunu `CardTag`
   * dışarıda hâlâ zorluyor — `as="input"` yazan derleme hatası alır.
   */
  const Tag = as as ElementType;

  return (
    <Tag
      {...rest}
      className={cn(
        "rounded-xl",
        TONES[tone],
        interactive && INTERACTIVE,
        className,
      )}
      style={PADS[pad] ? { padding: PADS[pad] } : undefined}
    >
      {children}
    </Tag>
  );
}
