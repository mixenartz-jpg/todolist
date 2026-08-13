import { cn } from "@/lib/ui/cn";

/*
 * Yükleme iskeleti.
 *
 * Beş ekrana (Notlar, Yanlışlar, Rutinler, İstatistik, Bugün) aynı
 * satır elle kopyalanmıştı — kademe gecikmesi dâhil. Ürün arayüzünde
 * içeriğin ortasında dönen bir çark YOK: iskelet gelecek yerleşimi
 * gösterir ve sayfa yüklendiğinde hiçbir şey zıplamaz.
 */

interface SkeletonProps {
  /** Piksel yüksekliği — gelecek içeriğin gerçek boyuna yakın olmalı. */
  height: number;
  /**
   * Listedeki sırası. Her öğe 60ms geç başlar; göz aşağı doğru akan
   * bir dalga görür, aynı anda yanıp sönen bir blok değil.
   *
   * Gecikme 60ms'te tutulur: daha uzunu arayüzü yavaş hissettirir.
   */
  delayIndex?: number;
  className?: string;
}

export function Skeleton({ height, delayIndex = 0, className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-xl bg-[var(--color-surface-2)]",
        className,
      )}
      style={{
        height: `${height}px`,
        animationDelay: `${delayIndex * 60}ms`,
      }}
    />
  );
}

interface SkeletonListProps {
  /** Kaç satır. */
  count: number;
  height: number;
  className?: string;
}

/**
 * İskelet listesi — kademelendirmeyi otomatik yapar.
 *
 * `role`/`aria-busy` VERİLMEZ: her iskelet zaten `aria-hidden` ve
 * yükleniyor bilgisini veren şey ekran gövdesindeki gerçek durum
 * anlatımıdır. İskeleti ekran okuyucuya duyurmak "yükleniyor,
 * yükleniyor, yükleniyor" diye tekrar ederdi.
 */
export function SkeletonList({ count, height, className }: SkeletonListProps) {
  return (
    <div
      className={cn("flex flex-col", className)}
      style={{ gap: "var(--row-gap)" }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} delayIndex={i} />
      ))}
    </div>
  );
}
