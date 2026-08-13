"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import "./glass.css";

/*
 * Ekran iskeleti — 17 ekranın ortak kabı.
 *
 * Her ekran bugüne kadar aynı üç şeyi elle tekrar ediyordu: dış sarmal,
 * kenarlıklı başlık şeridi ve ortalanmış gövde. On dokuz kopya, on
 * dokuz ayrı ölçü. Buraya toplanınca "nefes payını aç" isteği 17
 * düzenleme değil `globals.css`'te tek satır oldu.
 *
 * Ölçülerin HİÇBİRİ burada sabit yazılmaz; hepsi `--screen-*`,
 * `--header-*` ve `--stack-gap` token'larından gelir.
 *
 * NOT: elle memoization YOK. React Compiler açık (`next.config.ts`)
 * ve bu bileşenlerin hepsi `children` alıp prop yayıyor — derleyici
 * sahibi, `memo`/`useMemo` eklemek onun işine karışır.
 */

/** Gövde ölçüsü. Yoğunluğa göre seçilir, keyfi değil. */
type ScreenWidth = "2xl" | "3xl" | "6xl" | "full";

const WIDTH: Record<ScreenWidth, string> = {
  /* Okunan yüzeyler: Bugün, Notlar, Yanlışlar, Hedefler, Özet. */
  "2xl": "max-w-2xl",
  /* Orta yoğunluk: Takvim, İstatistik. */
  "3xl": "max-w-3xl",
  /* Izgaralar: Hafta, Planlama. */
  "6xl": "max-w-6xl",
  /* Kendi ölçüsünü kendi koyan yüzeyler (Matris kendi kaydırıcısında). */
  full: "max-w-full",
};

interface ScreenProps {
  children: ReactNode;
  className?: string;
}

/**
 * Ekranın dış kabı.
 *
 * `min-h-0` ZORUNLU: `AppShell`'in `<main>`'i bir flex konteyner ve
 * `min-height: auto` varsayılanı içerideki kaydırıcıların (matris,
 * sheet) küçülmesini engeller — sayfa taşar.
 */
export function Screen({ children, className }: ScreenProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {children}
    </div>
  );
}

interface ScreenHeaderProps {
  title: ReactNode;
  /** Başlığın altındaki ikinci satır — tarih aralığı, sayaç, ipucu. */
  subtitle?: ReactNode;
  /** Sağa yaslanan eylemler: Button, IconButton, sayfalama okları. */
  actions?: ReactNode;
  /**
   * Başlığın ALTINA giren tam genişlik şerit: alt sekmeler, filtre
   * çubuğu. `actions` ile aynı satırı paylaşmaz — filtre çubuğu
   * başlıkla aynı hizada dururken sıkışıyordu.
   */
  children?: ReactNode;
  /**
   * Yapışkan + cam. Varsayılan `true`.
   *
   * Tek bayrakla kapatılabilir olması bilinçli: iOS Safari'de
   * `position: sticky` + `backdrop-filter` "donmuş blur" davranışı
   * gösterebiliyor (çubuk ilk boyamayı örnekleyip kaydırmada
   * güncellemeyi bırakıyor). Gerçek cihazda sorun görülürse tek yerden
   * kapatılır ve cam yalnızca SABİT kabukta (şerit, sekme çubuğu,
   * sheet, dialog) kalır.
   */
  sticky?: boolean;
  /** Başlık içeriğini gövdeyle aynı sütuna hizalar. */
  width?: ScreenWidth;
}

/**
 * Ekran başlığı.
 *
 * Yapışkan olduğunda cam: altından içerik akar ve malzeme tam olarak
 * bunun için var. Kenarlık `--glass-line` (alfa-beyaz), `--color-line`
 * değil — gerekçe `glass.css`'te.
 */
export function ScreenHeader({
  title,
  subtitle,
  actions,
  children,
  sticky = true,
  width = "full",
}: ScreenHeaderProps) {
  const ref = useRef<HTMLElement>(null);

  /*
   * Kendi yüksekliğini `--header-h` olarak yayımlar.
   *
   * İÇERİDEKİ yapışkan elemanların (Planlama'nın hafta başlığı) bu
   * kadar aşağıdan tutunması gerekiyor: `top: 0` verirlerse aynı
   * kaydırma kökünde ve aynı z katmanında oldukları için ekran
   * başlığıyla ÇAKIŞIRLAR.
   *
   * Sabit bir değer yeterli değil — bu başlık `subtitle` ve `children`
   * (Planlama'nın filtre çubuğu) taşıyabiliyor ve yüksekliği ekrandan
   * ekrana değişiyor. `ResizeObserver` ölçüyü gerçek DOM'dan alır ve
   * filtre çubuğu sarmaya başladığında da doğru kalır.
   *
   * Değişken `documentElement`'e yazılır: yapışkan çocuk başka bir alt
   * ağaçta (ScreenBody) ve başlığın kendi kapsamından okuyamaz.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el || !sticky) return;

    const publish = () => {
      document.documentElement.style.setProperty(
        "--header-h",
        `${el.getBoundingClientRect().height}px`,
      );
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sticky]);

  return (
    <header
      ref={ref}
      className={cn(
        "shrink-0",
        sticky
          ? "glassChrome glassChrome--top sticky top-0 z-[var(--z-sticky)]"
          : "border-b border-[var(--color-line)]",
      )}
      style={{
        paddingInline: "var(--header-px)",
        paddingBlock: "var(--header-py)",
      }}
    >
      <div className={cn("mx-auto w-full", WIDTH[width])}>
        <div className="flex items-center gap-3">
          <div className="mr-auto min-w-0">
            <h1 className="truncate text-[length:var(--text-xl)] font-semibold tracking-[-0.015em]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>

        {children && <div className="mt-3">{children}</div>}
      </div>
    </header>
  );
}

interface ScreenBodyProps {
  children: ReactNode;
  width?: ScreenWidth;
  /** `md` = --stack-gap (bölümler arası), `sm` = --stack-gap-sm. */
  gap?: "sm" | "md";
  className?: string;
}

/**
 * Ekran gövdesi — ortalanmış, ölçülü, nefes paylı.
 *
 * `flex-1` ile kalan yüksekliği doldurur ki boş ekranlarda
 * `EmptyState` dikeyde ortalanabilsin.
 */
export function ScreenBody({
  children,
  width = "2xl",
  gap = "md",
  className,
}: ScreenBodyProps) {
  return (
    <div
      className={cn("mx-auto flex w-full flex-1 flex-col", WIDTH[width], className)}
      style={{
        paddingInline: "var(--screen-px)",
        paddingBlock: "var(--screen-py)",
        gap: gap === "md" ? "var(--stack-gap)" : "var(--stack-gap-sm)",
      }}
    >
      {children}
    </div>
  );
}
