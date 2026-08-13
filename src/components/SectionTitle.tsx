import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

/*
 * Bölüm başlığı.
 *
 * Uygulamada aynı iki kalıp yirmi kadar yerde elle tekrarlanıyordu:
 * büyük bölüm başlığı (`--text-lg`) ve sönük alt başlık (`--text-sm`
 * + `ink-2`). Ölçü ve alt boşluk her kopyada biraz farklıydı; ritim
 * bu yüzden tutmuyordu.
 *
 * `SectionHeading` (features/sections) ile KARIŞTIRILMAZ: o yeniden
 * adlandırılabilir, kullanıcı verisi taşıyan bir başlık. Bu, sabit
 * metinli yapısal başlık.
 */

interface SectionTitleProps {
  children: ReactNode;
  /**
   * `2` → bölüm başlığı (`--text-lg`, tam mürekkep).
   * `3` → alt başlık (`--text-sm`, sönük).
   *
   * Sayı görsel ölçüyü DEĞİL belge hiyerarşisini seçer; ekran okuyucu
   * sırası da buradan gelir.
   */
  level?: 2 | 3;
  /** Sağa yaslanan sayaç, düğme ya da rozet. */
  trailing?: ReactNode;
  className?: string;
}

export function SectionTitle({
  children,
  level = 2,
  trailing,
  className,
}: SectionTitleProps) {
  const Tag = level === 2 ? "h2" : "h3";

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <Tag
        className={cn(
          "mr-auto min-w-0 truncate",
          level === 2
            ? "text-[length:var(--text-lg)] font-medium tracking-[-0.01em]"
            : "text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]",
        )}
      >
        {children}
      </Tag>

      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
